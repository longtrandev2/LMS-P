package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.ScheduleDtos.LeaveReview;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class LeaveReviewServiceTest {
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final AttendanceRecordRepository records = mock(AttendanceRecordRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final AuditService audit = mock(AuditService.class);
    private final LeaveReviewService service = new LeaveReviewService(leaves, records, users, access, notifications,
            audit, new ScheduleMapper());
    private final LmsClass clazz = clazz(null);
    private final User an = user(42, "student");
    private final ClassSession item = session(clazz, 30, 2, LocalDate.of(2026, 11, 2), 1, 3);
    private LeaveRequest request;

    @BeforeEach void setUp() {
        request = leave(item, an, 77, LeaveRequestStatus.pending);
        when(leaves.findLockedById(77L)).thenReturn(Optional.of(request));
        when(users.findById(7L)).thenReturn(Optional.of(clazz.getLecturer()));
    }

    @Test void approvalCreatesExcusedAttendanceAndNotifiesStudent() {
        var view = service.change(77L, new LeaveReview(LeaveRequestStatus.approved, "Đã xem giấy"), 7L, false);
        assertThat(view.status()).isEqualTo(LeaveRequestStatus.approved);
        assertThat(view.reviewed_by_name()).isEqualTo("Demo lecturer");
        var saved = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(records).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(AttendanceStatus.excused);
        assertThat(saved.getValue().getStudentId()).isEqualTo(42L);
        verify(notifications).create(eq(42L), eq("leave_request.reviewed"), anyString(), anyString(), anyMap());
        verify(audit).record(eq(7L), eq("leave_request.review"), eq("leave_request"), eq(77L), anyMap(), anyMap());
    }

    @Test void approvalTurnsAbsenceIntoExcusedButKeepsPresence() {
        var absent = new AttendanceRecord(item, 42L, AttendanceStatus.absent, "Không báo", 7L, LocalDateTime.now());
        when(records.findBySession_IdAndStudentId(30L, 42L)).thenReturn(Optional.of(absent));
        service.change(77L, new LeaveReview(LeaveRequestStatus.approved, null), 7L, false);
        assertThat(absent.getStatus()).isEqualTo(AttendanceStatus.excused);

        request = leave(item, an, 78, LeaveRequestStatus.pending);
        when(leaves.findLockedById(78L)).thenReturn(Optional.of(request));
        var late = new AttendanceRecord(item, 42L, AttendanceStatus.late, null, 7L, LocalDateTime.now());
        when(records.findBySession_IdAndStudentId(30L, 42L)).thenReturn(Optional.of(late));
        service.change(78L, new LeaveReview(LeaveRequestStatus.approved, null), 7L, false);
        assertThat(late.getStatus()).isEqualTo(AttendanceStatus.late);
        verify(records, never()).save(any());
    }

    @Test void rejectionDoesNotTouchAttendance() {
        service.change(77L, new LeaveReview(LeaveRequestStatus.rejected, "Thiếu minh chứng"), 7L, false);
        assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.rejected);
        verifyNoInteractions(records);
    }

    @Test void onlyPendingRequestsCanBeReviewed() {
        request.review(LeaveRequestStatus.rejected, null, clazz.getLecturer(), LocalDateTime.now());
        assertThatThrownBy(() -> service.change(77L, new LeaveReview(LeaveRequestStatus.approved, null), 7L, false))
                .extracting("code").isEqualTo("CONFLICT");
    }

    @Test void otherLecturersCannotReview() {
        doThrow(new LmsException("FORBIDDEN", "x", HttpStatus.FORBIDDEN, null)).when(access).manage(3L, 8L, false);
        assertThatThrownBy(() -> service.change(77L, new LeaveReview(LeaveRequestStatus.approved, null), 8L, false))
                .extracting("code").isEqualTo("FORBIDDEN");
        assertThat(request.isPending()).isTrue();
    }

    @Test void ownerCancelsWhilePendingAndNobodyElseCan() {
        assertThatThrownBy(() -> service.change(77L, new LeaveReview(LeaveRequestStatus.cancelled, null), 7L, false))
                .extracting("code").isEqualTo("FORBIDDEN");
        service.change(77L, new LeaveReview(LeaveRequestStatus.cancelled, null), 42L, false);
        assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.cancelled);
        assertThatThrownBy(() -> service.change(77L, new LeaveReview(LeaveRequestStatus.cancelled, null), 42L, false))
                .extracting("code").isEqualTo("CONFLICT");
    }

    @Test void pendingIsNotAValidTarget() {
        assertThatThrownBy(() -> service.change(77L, new LeaveReview(LeaveRequestStatus.pending, null), 7L, false))
                .extracting("code").isEqualTo("VALIDATION_ERROR");
    }
}
