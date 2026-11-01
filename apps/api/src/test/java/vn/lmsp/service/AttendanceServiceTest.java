package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class AttendanceServiceTest {
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final AttendanceRecordRepository records = mock(AttendanceRecordRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final AuditService audit = mock(AuditService.class);
    private final AttendanceService service = new AttendanceService(sessions, records, enrollments, leaves, access,
            mock(SessionViewAssembler.class), new ScheduleMapper(), audit);
    private final LmsClass clazz = clazz(null);
    private final User an = user(42, "student"), binh = user(43, "student");
    private final ClassSession item = session(clazz, 30, 1, LocalDate.of(2026, 11, 2), 1, 3);

    @BeforeEach void setUp() {
        when(sessions.findLockedById(30L)).thenReturn(Optional.of(item));
        when(sessions.findById(30L)).thenReturn(Optional.of(item));
        when(access.manage(3L, 7L, false)).thenReturn(clazz);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active))
                .thenReturn(List.of(enrollment(clazz, an), enrollment(clazz, binh)));
        when(enrollments.findByLmsClass_IdAndStatusOrderByStudent_Id(eq(3L), eq(EnrollmentStatus.active), any()))
                .thenReturn(roster(clazz, an, binh));
    }

    private static AttendanceUpdate update(AttendanceEntry... entries) { return new AttendanceUpdate(List.of(entries)); }

    @Test void upsertsRecordsAndMarksTheSessionTakenOnFirstSave() {
        AttendanceRecord existing = new AttendanceRecord(item, 42L, AttendanceStatus.absent, null, 7L, LocalDateTime.now());
        when(records.findBySession_Id(30L)).thenReturn(List.of(existing));

        service.update(30L, update(new AttendanceEntry(42L, AttendanceStatus.present, " "),
                new AttendanceEntry(43L, AttendanceStatus.late, "Muộn 10 phút")), 7L, false);

        assertThat(existing.getStatus()).isEqualTo(AttendanceStatus.present);
        assertThat(existing.getNote()).isNull();
        var saved = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(records).save(saved.capture());
        assertThat(saved.getValue().getStudentId()).isEqualTo(43L);
        assertThat(saved.getValue().getStatus()).isEqualTo(AttendanceStatus.late);
        assertThat(item.getAttendanceTakenAt()).isNotNull();
        verify(audit).record(eq(7L), eq("attendance.update"), eq("class_session"), eq(30L), anyMap(), anyMap());
    }

    @Test void laterEditsKeepTheFirstAttendanceTimestamp() {
        LocalDateTime first = LocalDateTime.of(2026, 11, 2, 1, 0);
        ReflectionTestUtils.setField(item, "attendanceTakenAt", first);
        when(records.findBySession_Id(30L)).thenReturn(List.of());
        service.update(30L, update(new AttendanceEntry(42L, AttendanceStatus.present, null)), 7L, false);
        assertThat(item.getAttendanceTakenAt()).isEqualTo(first);
    }

    @Test void onlyActiveStudentsOfTheClassCanBeMarked() {
        assertThatThrownBy(() -> service.update(30L, update(new AttendanceEntry(99L, AttendanceStatus.present, null)), 7L, false))
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatThrownBy(() -> service.update(30L, update(new AttendanceEntry(42L, AttendanceStatus.present, null),
                new AttendanceEntry(42L, AttendanceStatus.absent, null)), 7L, false)).extracting("code").isEqualTo("VALIDATION_ERROR");
        verify(records, never()).save(any());
        assertThat(item.getAttendanceTakenAt()).isNull();
    }

    @Test void cancelledSessionCannotBeMarked() {
        item.setCancelled(true);
        assertThatThrownBy(() -> service.update(30L, update(new AttendanceEntry(42L, AttendanceStatus.present, null)), 7L, false))
                .extracting("code").isEqualTo("CONFLICT");
    }

    @Test void sheetListsActiveStudentsWithStatusLeaveRequestAndSummary() {
        when(records.findBySession_Id(30L)).thenReturn(List.of(
                new AttendanceRecord(item, 42L, AttendanceStatus.excused, null, 7L, LocalDateTime.now())));
        when(leaves.findActiveBySessions(List.of(30L), null)).thenReturn(List.of(leave(item, an, 5, vn.lmsp.enums.LeaveRequestStatus.approved)));

        AttendanceSheet sheet = service.sheet(30L, 7L, false);

        assertThat(sheet.items()).extracting(AttendanceItem::student_id).containsExactly(42L, 43L);
        assertThat(sheet.items().get(0).leave_request().id()).isEqualTo(5L);
        assertThat(sheet.items().get(1).status()).isNull();
        assertThat(sheet.summary()).isEqualTo(new SessionSummary(2, 0, 0, 1, 0, 1));
    }
}
