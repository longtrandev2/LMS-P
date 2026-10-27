package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.ScheduleDtos.ClassAttendanceSummary;
import vn.lmsp.dto.ScheduleDtos.StudentAttendance;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.AttendanceRecordRepository;
import vn.lmsp.repository.AttendanceRecordRepository.StatusCount;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;

class AttendanceStatsServiceTest {
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final AttendanceRecordRepository records = mock(AttendanceRecordRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final AttendanceStatsService service = new AttendanceStatsService(sessions, records, enrollments, access);
    private final LmsClass clazz = clazz(null);
    private final User an = user(42, "student"), binh = user(43, "student");

    private static ClassSessionRepository.Totals totals(int total, int due, int taken) {
        return new ClassSessionRepository.Totals() {
            public Number getTotal() { return (long) total; }
            public Number getDue() { return (long) due; }
            public Number getTaken() { return (long) taken; }
        };
    }
    private static StatusCount row(long student, AttendanceStatus status, long count) {
        return new StatusCount() {
            public Long getStudentId() { return student; }
            public AttendanceStatus getStatus() { return status; }
            public Number getTotal() { return count; }
        };
    }

    @BeforeEach void setUp() {
        when(sessions.totals(eq(3L), any())).thenReturn(totals(10, 6, 5));
        when(records.countByStatus(eq(3L), isNull(), any())).thenReturn(List.of(row(42, AttendanceStatus.present, 3),
                row(42, AttendanceStatus.late, 1), row(42, AttendanceStatus.absent, 1), row(99, AttendanceStatus.absent, 4)));
        when(records.countByStatus(eq(3L), eq(42L), any())).thenReturn(List.of(row(42, AttendanceStatus.present, 3),
                row(42, AttendanceStatus.late, 1), row(42, AttendanceStatus.absent, 1)));
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active))
                .thenReturn(List.of(enrollment(clazz, an), enrollment(clazz, binh)));
        when(enrollments.findByLmsClass_IdAndStatusOrderByStudent_Id(eq(3L), eq(EnrollmentStatus.active), any()))
                .thenReturn(roster(clazz, an, binh));
    }

    @Test void providerCountsEveryActiveStudentAndDerivesUnmarkedFromDueSessions() {
        var counts = service.countsByStudent(3L);
        assertThat(counts).containsOnlyKeys(42L, 43L);
        assertThat(counts.get(42L)).isEqualTo(new AttendanceCounts(10, 3, 1, 0, 1, 1));
        assertThat(counts.get(43L)).isEqualTo(new AttendanceCounts(10, 0, 0, 0, 0, 6));
    }

    @Test void studentSeesOwnCountsWithDefaultMaxAbsences() {
        when(access.member(3L, 42L, false)).thenReturn(new ClassAccess.Member(clazz, false));
        var mine = (StudentAttendance) service.summary(3L, 42L, false);
        assertThat(mine).isEqualTo(new StudentAttendance(10, 3, 1, 0, 1, 1, 2, true));
    }

    @Test void policyMaxAbsencesOverridesTheDefaultAndDecidesEligibility() throws Exception {
        ReflectionTestUtils.setField(clazz, "gradePolicy",
                new ObjectMapper().readTree("{\"attendance\":{\"max_absences\":0}}"));
        when(access.member(3L, 42L, false)).thenReturn(new ClassAccess.Member(clazz, false));
        var mine = (StudentAttendance) service.summary(3L, 42L, false);
        assertThat(mine.max_absences()).isZero();
        assertThat(mine.eligible()).isFalse();
    }

    @Test void lecturerSeesEveryStudentAndSessionTotals() {
        when(access.member(3L, 7L, false)).thenReturn(new ClassAccess.Member(clazz, true));
        var all = (ClassAttendanceSummary) service.summary(3L, 7L, false);
        assertThat(all.total_sessions()).isEqualTo(10);
        assertThat(all.taken_sessions()).isEqualTo(5);
        assertThat(all.items()).extracting(r -> r.student_id()).containsExactly(42L, 43L);
        assertThat(all.items().get(1).unmarked()).isEqualTo(6);
    }

    @Test void maxAbsencesDefaultsToTwentyPercentRoundedDown() throws Exception {
        assertThat(AttendanceStatsService.maxAbsences(null, 14)).isEqualTo(2);
        assertThat(AttendanceStatsService.maxAbsences(new ObjectMapper().readTree(
                "{\"attendance\":{\"max_absences\":null}}"), 15)).isEqualTo(3);
        assertThat(AttendanceStatsService.maxAbsences(new ObjectMapper().readTree(
                "{\"attendance\":{\"max_absences\":4}}"), 15)).isEqualTo(4);
    }
}
