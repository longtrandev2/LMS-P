package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.ScheduleDtos.LeaveRequestView;
import vn.lmsp.dto.ScheduleDtos.LeaveReview;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.AttendanceRecord;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LeaveRequest;
import vn.lmsp.model.User;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.LeaveRequestRepository;
import vn.lmsp.repository.UserRepository;

/**
 * `PATCH /leave-requests/{id}` — giảng viên duyệt/từ chối, sinh viên hủy đơn đang chờ (spec §4).
 * Duyệt → điểm danh buổi đó thành `excused`, trừ khi đã `present`/`late`.
 */
@Service
@RequiredArgsConstructor
public class LeaveReviewService {
    private final LeaveRequestRepository leaveRequests;
    private final AttendanceRecordRepository records;
    private final UserRepository users;
    private final ClassAccess access;
    private final NotificationService notifications;
    private final AuditService audit;
    private final ScheduleMapper mapper;

    @Transactional
    public LeaveRequestView change(Long id, LeaveReview input, Long actor, boolean admin) {
        LeaveRequest item = leaveRequests.findLockedById(id).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy đơn xin nghỉ"));
        LeaveRequestStatus target = input.status();
        if (target == LeaveRequestStatus.cancelled) return cancel(item, actor);
        if (target != LeaveRequestStatus.approved && target != LeaveRequestStatus.rejected)
            throw ScheduleErrors.invalid("Trạng thái chỉ có thể là approved, rejected hoặc cancelled");
        access.manage(item.getClassId(), actor, admin);
        requirePending(item);
        LocalDateTime now = UtcTime.now();
        User reviewer = users.findById(actor).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy người dùng"));
        item.review(target, ScheduleErrors.blankToNull(input.review_note()), reviewer, now);
        Map<String, Object> next = new LinkedHashMap<>();
        next.put("status", target.name()); next.put("review_note", item.getReviewNote());
        if (target == LeaveRequestStatus.approved) next.put("attendance", markExcused(item, actor, now));
        audit.record(actor, "leave_request.review", "leave_request", id, Map.of("status", "pending"), next);
        ClassSession session = item.getSession();
        notifications.create(item.getStudentId(), "leave_request.reviewed",
                target == LeaveRequestStatus.approved ? "Đơn xin nghỉ đã được duyệt" : "Đơn xin nghỉ bị từ chối",
                "Buổi " + session.getSessionNo() + " (" + session.getSessionDate().format(LeaveRequestService.VN_DATE) + ")"
                        + (item.getReviewNote() == null ? "" : ": " + item.getReviewNote()),
                Map.of("leave_request_id", id, "class_id", item.getClassId(), "session_id", session.getId(), "status", target.name()));
        return mapper.toLeaveView(item);
    }

    private LeaveRequestView cancel(LeaveRequest item, Long actor) {
        if (!item.getStudentId().equals(actor)) throw ScheduleErrors.forbidden("Chỉ sinh viên gửi đơn mới được hủy đơn");
        requirePending(item);
        item.cancel();
        audit.record(actor, "leave_request.cancel", "leave_request", item.getId(), Map.of("status", "pending"), Map.of("status", "cancelled"));
        return mapper.toLeaveView(item);
    }

    /** Trả trạng thái điểm danh sau khi duyệt (để ghi audit). */
    private String markExcused(LeaveRequest item, Long actor, LocalDateTime now) {
        Long sessionId = item.getSession().getId();
        AttendanceRecord record = records.findBySession_IdAndStudentId(sessionId, item.getStudentId()).orElse(null);
        if (record == null) {
            records.save(new AttendanceRecord(item.getSession(), item.getStudentId(), AttendanceStatus.excused, null, actor, now));
            return AttendanceStatus.excused.name();
        }
        if (!record.attended()) record.mark(AttendanceStatus.excused, record.getNote(), actor, now);
        return record.getStatus().name();
    }

    private static void requirePending(LeaveRequest item) {
        if (!item.isPending()) throw ScheduleErrors.conflict("Đơn xin nghỉ không còn ở trạng thái chờ duyệt");
    }
}
