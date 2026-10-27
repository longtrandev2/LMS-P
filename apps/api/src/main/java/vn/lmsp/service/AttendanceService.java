package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.AttendanceRecord;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.LeaveRequestRepository;

/** Điểm danh một buổi — class-schedule-grades-spec §3, api-spec §11. */
@Service
@RequiredArgsConstructor
public class AttendanceService {
    private final ClassSessionRepository sessions;
    private final AttendanceRecordRepository records;
    private final EnrollmentRepository enrollments;
    private final LeaveRequestRepository leaveRequests;
    private final ClassAccess access;
    private final SessionViewAssembler views;
    private final ScheduleMapper mapper;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public AttendanceSheet sheet(Long sessionId, Long actor, boolean admin) {
        ClassSession session = sessions.findById(sessionId).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy buổi học"));
        LmsClass clazz = access.manage(session.getClassId(), actor, admin);
        return buildSheet(clazz, session);
    }

    @Transactional
    public AttendanceSheet update(Long sessionId, AttendanceUpdate input, Long actor, boolean admin) {
        ClassSession session = sessions.findLockedById(sessionId).orElseThrow(() -> ScheduleErrors.notFound("Không tìm thấy buổi học"));
        LmsClass clazz = access.manage(session.getClassId(), actor, admin);
        if (session.isCancelled()) throw ScheduleErrors.conflict("Buổi học đã bị hủy, không thể điểm danh");
        Set<Long> active = enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(clazz.getId(), EnrollmentStatus.active)
                .stream().map(e -> e.getStudent().getId()).collect(Collectors.toSet());
        validate(input.records(), active);
        Map<Long, AttendanceRecord> existing = records.findBySession_Id(sessionId).stream()
                .collect(Collectors.toMap(AttendanceRecord::getStudentId, Function.identity()));
        LocalDateTime now = UtcTime.now();
        Map<String, Object> before = new LinkedHashMap<>(), after = new LinkedHashMap<>();
        for (AttendanceEntry entry : input.records()) {
            String note = ScheduleErrors.blankToNull(entry.note());
            AttendanceRecord record = existing.get(entry.student_id());
            if (record == null) {
                records.save(new AttendanceRecord(session, entry.student_id(), entry.status(), note, actor, now));
            } else if (record.getStatus() != entry.status() || !Objects.equals(record.getNote(), note)) {
                before.put(entry.student_id().toString(), record.getStatus().name());
                record.mark(entry.status(), note, actor, now);
            } else continue;
            after.put(entry.student_id().toString(), entry.status().name());
        }
        boolean first = session.getAttendanceTakenAt() == null;
        session.markAttendanceTaken(now);
        if (first || !after.isEmpty())
            audit.record(actor, "attendance.update", "class_session", sessionId, before.isEmpty() ? null : before, after);
        records.flush();
        return buildSheet(clazz, session);
    }

    private AttendanceSheet buildSheet(LmsClass clazz, ClassSession session) {
        List<User> roster = enrollments.findByLmsClass_IdAndStatusOrderByStudent_Id(clazz.getId(), EnrollmentStatus.active,
                Pageable.unpaged()).getContent().stream().map(e -> e.getStudent()).toList();
        Map<Long, AttendanceRecord> marked = records.findBySession_Id(session.getId()).stream()
                .collect(Collectors.toMap(AttendanceRecord::getStudentId, Function.identity()));
        Map<Long, LeaveRequestView> leaves = new HashMap<>();
        leaveRequests.findActiveBySessions(List.of(session.getId()), null)
                .forEach(l -> leaves.putIfAbsent(l.getStudentId(), mapper.toLeaveView(l)));
        int[] counts = new int[AttendanceStatus.values().length];
        List<AttendanceItem> items = new ArrayList<>();
        for (User student : roster) {
            AttendanceRecord record = marked.get(student.getId());
            if (record != null) counts[record.getStatus().ordinal()]++;
            items.add(new AttendanceItem(student.getId(), student.getStudentCode(), student.getFullName(),
                    record == null ? null : record.getStatus(), record == null ? null : record.getNote(),
                    leaves.get(student.getId())));
        }
        int markedCount = Arrays.stream(counts).sum();
        SessionSummary summary = new SessionSummary(roster.size(), counts[AttendanceStatus.present.ordinal()],
                counts[AttendanceStatus.late.ordinal()], counts[AttendanceStatus.excused.ordinal()],
                counts[AttendanceStatus.absent.ordinal()], roster.size() - markedCount);
        return new AttendanceSheet(views.view(clazz, session, null), items, summary);
    }

    private static void validate(List<AttendanceEntry> entries, Set<Long> active) {
        Set<Long> seen = new HashSet<>();
        List<Long> invalid = new ArrayList<>(), duplicated = new ArrayList<>();
        for (AttendanceEntry entry : entries) {
            if (!active.contains(entry.student_id())) invalid.add(entry.student_id());
            else if (!seen.add(entry.student_id())) duplicated.add(entry.student_id());
        }
        if (!invalid.isEmpty())
            throw ScheduleErrors.invalid("Có sinh viên không thuộc lớp hoặc không còn học lớp", Map.of("student_ids", invalid));
        if (!duplicated.isEmpty())
            throw ScheduleErrors.invalid("Mỗi sinh viên chỉ xuất hiện một lần", Map.of("student_ids", duplicated));
    }
}
