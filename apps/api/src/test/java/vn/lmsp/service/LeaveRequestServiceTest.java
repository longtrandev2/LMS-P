package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class LeaveRequestServiceTest {
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final LeaveEvidenceStorage storage = mock(LeaveEvidenceStorage.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final LeaveRequestService service = new LeaveRequestService(leaves, sessions, users, access, storage,
            notifications, new ScheduleMapper(), vn.lmsp.support.TestSettings.defaults());
    private final LmsClass clazz = clazz(null);
    private final User an = user(42, "student");
    private final MockMultipartFile file = new MockMultipartFile("evidence", "giay.pdf", "application/pdf", "%PDF-1".getBytes());
    private ClassSession item;

    @BeforeEach void setUp() {
        item = session(clazz, 30, 4, UtcTime.now().toLocalDate().plusDays(2), 1, 3);
        when(sessions.findLockedById(30L)).thenReturn(Optional.of(item));
        when(access.find(3L)).thenReturn(clazz);
        when(users.findById(42L)).thenReturn(Optional.of(an));
        when(storage.store(eq(3L), any())).thenReturn(new LeaveEvidenceStorage.StoredEvidence(
                "leave-requests/3/a.pdf", "giay.pdf", 6, "application/pdf"));
        when(leaves.save(any())).thenAnswer(call -> identified(call.getArgument(0), 77L));
    }

    @Test void studentSubmitsRequestAndLecturerIsNotified() {
        var view = service.create(30L, 42L, "  Ốm sốt  ", file);
        assertThat(view.id()).isEqualTo(77L);
        assertThat(view.reason()).isEqualTo("Ốm sốt");
        assertThat(view.status()).isEqualTo(LeaveRequestStatus.pending);
        assertThat(view.evidence_name()).isEqualTo("giay.pdf");
        verify(notifications).create(eq(7L), eq("leave_request.created"), contains("Demo student"), anyString(), anyMap());
    }

    @Test void reasonIsRequiredAndLimited() {
        assertThatThrownBy(() -> service.create(30L, 42L, " ", file)).extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatThrownBy(() -> service.create(30L, 42L, "x".repeat(1001), file)).extracting("code").isEqualTo("VALIDATION_ERROR");
        verifyNoInteractions(storage);
    }

    @Test void onlyOneOpenRequestPerSession() {
        when(leaves.existsBySession_IdAndStudent_IdAndStatusIn(eq(30L), eq(42L), anyCollection())).thenReturn(true);
        assertThatThrownBy(() -> service.create(30L, 42L, "Ốm", file)).extracting("code").isEqualTo("CONFLICT");
        verifyNoInteractions(storage);
    }

    @Test void cancelledOrOldSessionsAreRejected() {
        item.setCancelled(true);
        assertThatThrownBy(() -> service.create(30L, 42L, "Ốm", file)).extracting("code").isEqualTo("CONFLICT");
        ClassSession old = session(clazz, 31, 1, LocalDate.now().minusDays(9), 1, 3);
        when(sessions.findLockedById(31L)).thenReturn(Optional.of(old));
        assertThatThrownBy(() -> service.create(31L, 42L, "Ốm", file)).extracting("code").isEqualTo("DEADLINE_PASSED");
    }

    @Test void studentOutsideTheClassCannotSubmit() {
        doThrow(new LmsException("ENROLLMENT_REQUIRED", "x", HttpStatus.FORBIDDEN, null)).when(access).requireStudent(clazz, 50L);
        assertThatThrownBy(() -> service.create(30L, 50L, "Ốm", file)).extracting("code").isEqualTo("ENROLLMENT_REQUIRED");
    }

    @Test void evidenceIsForOwnerOrManagersOnly() {
        LeaveRequest request = leave(item, an, 77, LeaveRequestStatus.pending);
        when(leaves.findWithDetailsById(77L)).thenReturn(Optional.of(request));
        service.evidence(77L, 42L, false);
        verify(access, never()).manage(any(), any(), anyBoolean());
        doThrow(new LmsException("FORBIDDEN", "x", HttpStatus.FORBIDDEN, null)).when(access).manage(3L, 43L, false);
        assertThatThrownBy(() -> service.evidence(77L, 43L, false)).extracting("code").isEqualTo("FORBIDDEN");
    }
}
