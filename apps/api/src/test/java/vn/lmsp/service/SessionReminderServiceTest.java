package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;

class SessionReminderServiceTest {
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final SessionReminderService service = new SessionReminderService(sessions, enrollments, notifications);
    private final LmsClass clazz = clazz(null);

    @Test void notifiesEveryActiveStudentOncePerSession() {
        ClassSession soon = session(clazz, 30, 3, UtcTime.now().toLocalDate(), 1, 2);
        when(sessions.findUpcomingToNotify(any(), any())).thenReturn(List.of(soon));
        when(sessions.markUpcomingNotified(eq(30L), any())).thenReturn(1, 0);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active))
                .thenReturn(List.of(enrollment(clazz, user(42, "student")), enrollment(clazz, user(43, "student"))));

        assertThat(service.sendDue()).isEqualTo(1);
        assertThat(service.sendDue()).isZero();

        verify(notifications).create(eq(42L), eq("session.upcoming"), contains("Lớp 01"), contains("phòng A101"), anyMap());
        verify(notifications).create(eq(43L), eq("session.upcoming"), anyString(), anyString(), anyMap());
        verifyNoMoreInteractions(notifications);
    }

    @Test void looksThirtyMinutesAhead() {
        when(sessions.findUpcomingToNotify(any(), any())).thenReturn(List.of());
        service.sendDue();
        var from = ArgumentCaptor.forClass(LocalDateTime.class);
        var until = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(sessions).findUpcomingToNotify(from.capture(), until.capture());
        assertThat(until.getValue()).isEqualTo(from.getValue().plusMinutes(30));
        verifyNoInteractions(notifications);
    }
}
