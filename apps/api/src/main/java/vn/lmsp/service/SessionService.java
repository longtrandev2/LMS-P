package vn.lmsp.service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.LeaveRequestRepository;
import vn.lmsp.repository.UserRepository;

/** Buổi học: danh sách, thêm/sửa/hủy/xóa từng buổi — class-schedule-grades-spec §2.2, api-spec §11. */
@Service
@RequiredArgsConstructor
public class SessionService {
    private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final ClassSessionRepository sessions;
    private final AttendanceRecordRepository records;
    private final LeaveRequestRepository leaveRequests;
    private final UserRepository users;
    private final ClassAccess access;
    private final SessionNumbering numbering;
    private final SessionViewAssembler views;
    private final ScheduleMapper mapper;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public SessionList list(Long classId, Long actor, boolean admin, SessionMode mode, String query) {
        ClassAccess.Member member = access.member(classId, actor, admin);
        String term = ScheduleErrors.blankToNull(query);
        List<ClassSession> matched = sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(classId).stream()
                .filter(s -> mode == null || s.getMode() == mode)
                .filter(s -> term == null || matches(s, term.toLowerCase(Locale.ROOT))).toList();
        return new SessionList(views.views(member.clazz(), matched, member.manager() ? null : actor));
    }

    @Transactional
    public SessionView create(Long classId, SessionInput input, Long actor, boolean admin) {
        LmsClass clazz = access.manageLocked(classId, actor, admin);
        SessionNumbering.validatePeriods(input.start_period(), input.end_period());
        List<ClassSession> existing = sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(classId);
        SessionNumbering.requireCapacity(existing.size() + 1);
        ClassSession item = sessions.save(new ClassSession(clazz, SessionNumbering.nextTemporaryNumber(existing),
                input.date(), input.start_period(), input.end_period(), ScheduleErrors.blankToNull(input.room()),
                input.mode(), ScheduleErrors.blankToNull(input.title()), ScheduleErrors.blankToNull(input.note()),
                users.getReferenceById(actor)));
        sessions.flush();
        numbering.renumber(classId);
        audit.record(actor, "session.create", "class_session", item.getId(), null, mapper.toSessionAudit(item));
        return views.view(clazz, item, null);
    }

    @Transactional
    public SessionView update(Long sessionId, SessionPatch patch, Long actor, boolean admin) {
        ClassSession item = session(sessionId);
        LmsClass clazz = access.manageLocked(item.getClassId(), actor, admin);
        Map<String, Object> old = mapper.toSessionAudit(item);
        var date = patch.date() == null ? item.getSessionDate() : patch.date();
        int start = patch.start_period() == null ? item.getStartPeriod() : patch.start_period();
        int end = patch.end_period() == null ? item.getEndPeriod() : patch.end_period();
        SessionNumbering.validatePeriods(start, end);
        boolean moved = !date.equals(item.getSessionDate()) || start != item.getStartPeriod() || end != item.getEndPeriod();
        item.reschedule(date, start, end);
        item.updateDetails(patch.room() == null ? item.getRoom() : ScheduleErrors.blankToNull(patch.room()),
                patch.mode() == null ? item.getMode() : patch.mode(),
                patch.title() == null ? item.getTitle() : ScheduleErrors.blankToNull(patch.title()),
                patch.note() == null ? item.getNote() : ScheduleErrors.blankToNull(patch.note()));
        if (patch.is_cancelled() != null) item.setCancelled(patch.is_cancelled());
        if (moved) numbering.renumber(clazz.getId());
        audit.record(actor, "session.update", "class_session", sessionId, old, mapper.toSessionAudit(item));
        return views.view(clazz, item, null);
    }

    @Transactional
    public void delete(Long sessionId, Long actor, boolean admin) {
        ClassSession item = session(sessionId);
        LmsClass clazz = access.manageLocked(item.getClassId(), actor, admin);
        if (item.getAttendanceTakenAt() != null || records.existsBySession_Id(sessionId))
            throw ScheduleErrors.conflict("Buổi học đã có điểm danh, chỉ có thể đánh dấu hủy");
        if (leaveRequests.existsBySession_Id(sessionId))
            throw ScheduleErrors.conflict("Buổi học đã có đơn xin nghỉ, chỉ có thể đánh dấu hủy");
        Map<String, Object> old = mapper.toSessionAudit(item);
        sessions.delete(item);
        sessions.flush();
        numbering.renumber(clazz.getId());
        audit.record(actor, "session.delete", "class_session", sessionId, old, null);
    }

    private ClassSession session(Long id) {
        return sessions.findById(id).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy buổi học"));
    }

    private static boolean matches(ClassSession s, String term) {
        return s.getSessionDate().toString().contains(term) || s.getSessionDate().format(VN_DATE).contains(term)
                || contains(s.getRoom(), term) || contains(s.getTitle(), term);
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }
}
