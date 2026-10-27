package vn.lmsp.service;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.ScheduleDtos.LeaveRequestView;
import vn.lmsp.dto.ScheduleDtos.Page;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LeaveRequest;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.LeaveRequestRepository;
import vn.lmsp.repository.UserRepository;

/** Gửi, xem và tải minh chứng đơn xin nghỉ — class-schedule-grades-spec §4. */
@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    static final int MAX_REASON = 1000;
    static final int LATE_DAYS = 7;
    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final LeaveRequestRepository leaveRequests;
    private final ClassSessionRepository sessions;
    private final UserRepository users;
    private final ClassAccess access;
    private final LeaveEvidenceStorage storage;
    private final NotificationService notifications;
    private final ScheduleMapper mapper;

    public record EvidenceFile(Path path, String name, String contentType) { }

    @Transactional
    public LeaveRequestView create(Long sessionId, Long studentId, String reason, MultipartFile evidence) {
        String text = ScheduleErrors.blankToNull(reason);
        if (text == null) throw ScheduleErrors.invalid("Lý do xin nghỉ là bắt buộc");
        if (text.length() > MAX_REASON) throw ScheduleErrors.invalid("Lý do xin nghỉ tối đa " + MAX_REASON + " ký tự");
        ClassSession session = sessions.findLockedById(sessionId).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy buổi học"));
        LmsClass clazz = access.find(session.getClassId());
        access.requireStudent(clazz, studentId);
        if (session.isCancelled()) throw ScheduleErrors.conflict("Buổi học đã bị hủy");
        LocalDateTime now = UtcTime.now();
        if (session.getEndsAt().isBefore(now.minusDays(LATE_DAYS)))
            throw new LmsException("DEADLINE_PASSED", "Chỉ gửi đơn cho buổi chưa diễn ra hoặc đã diễn ra trong "
                    + LATE_DAYS + " ngày gần nhất", HttpStatus.CONFLICT, null);
        if (leaveRequests.existsBySession_IdAndStudent_IdAndStatusIn(sessionId, studentId,
                List.of(LeaveRequestStatus.pending, LeaveRequestStatus.approved)))
            throw ScheduleErrors.conflict("Buổi này đã có đơn xin nghỉ đang chờ duyệt hoặc đã được duyệt");
        User student = users.findById(studentId).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy người dùng"));
        var stored = storage.store(clazz.getId(), evidence);
        LeaveRequest item = leaveRequests.save(new LeaveRequest(session, student, text, stored.path(), stored.name(),
                stored.size(), stored.type()));
        notifications.create(clazz.getLecturerId(), "leave_request.created", "Đơn xin nghỉ mới: " + student.getFullName(),
                "Buổi " + session.getSessionNo() + " (" + session.getSessionDate().format(VN_DATE) + ") — lớp " + clazz.getName(),
                Map.of("leave_request_id", item.getId(), "class_id", clazz.getId(), "session_id", sessionId));
        return mapper.toLeaveView(item);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequestView> list(Long classId, Long actor, boolean admin, LeaveRequestStatus status, int page, int limit) {
        ClassAccess.Member member = access.member(classId, actor, admin);
        var result = leaveRequests.search(classId, member.manager() ? null : actor, status,
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        return new Page<>(result.getContent().stream().map(mapper::toLeaveView).toList(), result.getTotalElements(), page, limit);
    }

    /** Chỉ chủ đơn hoặc giảng viên phụ trách/admin. */
    @Transactional(readOnly = true)
    public EvidenceFile evidence(Long id, Long actor, boolean admin) {
        LeaveRequest item = leaveRequests.findWithDetailsById(id).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy đơn xin nghỉ"));
        if (!item.getStudentId().equals(actor)) access.manage(item.getClassId(), actor, admin);
        return new EvidenceFile(storage.resolve(item.getEvidencePath()), item.getEvidenceName(), item.getEvidenceType());
    }
}
