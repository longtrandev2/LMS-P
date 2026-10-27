package vn.lmsp.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.AttendanceRecordRepository.StatusCount;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;

/**
 * Thống kê điểm danh theo lớp — class-schedule-grades-spec §3, §5.3.
 * Trạng thái chỉ đếm trên buổi không hủy đã diễn ra (qua giờ kết thúc) hoặc đã điểm danh; unmarked = số buổi đó
 * mà sinh viên chưa có bản ghi. total = mọi buổi không hủy.
 */
@Service
@RequiredArgsConstructor
public class AttendanceStatsService implements AttendanceSummaryProvider {
    private final ClassSessionRepository sessions;
    private final AttendanceRecordRepository records;
    private final EnrollmentRepository enrollments;
    private final ClassAccess access;

    @Override
    @Transactional(readOnly = true)
    public Map<Long, AttendanceCounts> countsByStudent(Long classId) {
        LocalDateTime now = UtcTime.now();
        var totals = sessions.totals(classId, now);
        Map<Long, int[]> byStudent = group(records.countByStatus(classId, null, now));
        Map<Long, AttendanceCounts> result = new LinkedHashMap<>();
        for (var enrollment : enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(classId, EnrollmentStatus.active)) {
            Long id = enrollment.getStudent().getId();
            result.put(id, counts(totals, byStudent.get(id)));
        }
        return result;
    }

    /** Giảng viên/admin → ClassAttendanceSummary; sinh viên → StudentAttendance của mình. */
    @Transactional(readOnly = true)
    public Object summary(Long classId, Long actor, boolean admin) {
        ClassAccess.Member member = access.member(classId, actor, admin);
        LmsClass clazz = member.clazz();
        LocalDateTime now = UtcTime.now();
        var totals = sessions.totals(classId, now);
        int maxAbsences = maxAbsences(clazz.getGradePolicy(), num(totals.getTotal()));
        if (!member.manager()) {
            AttendanceCounts c = counts(totals, group(records.countByStatus(classId, actor, now)).get(actor));
            return new StudentAttendance(c.total(), c.present(), c.late(), c.excused(), c.absent(), c.unmarked(),
                    maxAbsences, c.absences() <= maxAbsences);
        }
        Map<Long, int[]> byStudent = group(records.countByStatus(classId, null, now));
        List<StudentAttendanceRow> rows = new ArrayList<>();
        List<User> roster = enrollments.findByLmsClass_IdAndStatusOrderByStudent_Id(classId, EnrollmentStatus.active,
                Pageable.unpaged()).getContent().stream().map(e -> e.getStudent()).toList();
        for (User student : roster) {
            AttendanceCounts c = counts(totals, byStudent.get(student.getId()));
            rows.add(new StudentAttendanceRow(student.getId(), student.getStudentCode(), student.getFullName(), c.total(),
                    c.present(), c.late(), c.excused(), c.absent(), c.unmarked(), maxAbsences, c.absences() <= maxAbsences));
        }
        return new ClassAttendanceSummary(num(totals.getTotal()), num(totals.getTaken()), maxAbsences, rows);
    }

    /** `grade_policy.attendance.max_absences`; trống → floor(20% × số buổi không hủy). */
    static int maxAbsences(JsonNode policy, int totalSessions) {
        JsonNode value = policy == null ? null : policy.path("attendance").path("max_absences");
        if (value != null && value.isNumber() && value.asInt() >= 0) return value.asInt();
        return totalSessions / 5;
    }

    private static AttendanceCounts counts(ClassSessionRepository.Totals totals, int[] statuses) {
        int[] s = statuses == null ? new int[AttendanceStatus.values().length] : statuses;
        int present = s[AttendanceStatus.present.ordinal()], late = s[AttendanceStatus.late.ordinal()];
        int excused = s[AttendanceStatus.excused.ordinal()], absent = s[AttendanceStatus.absent.ordinal()];
        int unmarked = Math.max(0, num(totals.getDue()) - present - late - excused - absent);
        return new AttendanceCounts(num(totals.getTotal()), present, late, excused, absent, unmarked);
    }

    private static Map<Long, int[]> group(List<StatusCount> rows) {
        Map<Long, int[]> result = new HashMap<>();
        for (StatusCount row : rows)
            result.computeIfAbsent(row.getStudentId(), k -> new int[AttendanceStatus.values().length])
                    [row.getStatus().ordinal()] += num(row.getTotal());
        return result;
    }

    private static int num(Number value) { return value == null ? 0 : value.intValue(); }
}
