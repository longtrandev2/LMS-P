package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.AnnouncementInput;
import vn.lmsp.enums.AnnouncementAudience;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.model.Announcement;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.*;

class AnnouncementServiceTest {
    private final AnnouncementRepository announcements = mock(AnnouncementRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ClassRepository classes = mock(ClassRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final AuditService audit = mock(AuditService.class);
    private final AnnouncementService service = new AnnouncementService(announcements, users, classes, enrollments,
            new NotificationFanout(users, notifications), audit);

    @BeforeEach void setup() {
        when(users.findById(1L)).thenReturn(Optional.of(user(1, "admin")));
        when(announcements.save(any())).thenAnswer(call -> identified(call.getArgument(0), 9));
    }

    @Test void allAudienceNotifiesEveryUnlockedUserAndAudits() {
        when(users.findUnlockedIds()).thenReturn(List.of(1L, 42L, 43L));

        var created = service.create(input(AnnouncementAudience.ALL, "student", 3L), 1L);

        assertThat(created.id()).isEqualTo(9L);
        assertThat(created.recipient_count()).isEqualTo(3);
        var saved = ArgumentCaptor.forClass(Announcement.class);
        verify(announcements).save(saved.capture());
        assertThat(saved.getValue().getRole()).isNull();
        assertThat(saved.getValue().getClassId()).isNull();
        assertThat(saved.getValue().getRecipientCount()).isEqualTo(3);
        verify(notifications).create(eq(42L), eq("system.announcement"), eq("Bảo trì"), eq("Tối nay"), eq(Map.of("announcement_id", 9L)));
        verify(notifications, times(3)).create(anyLong(), eq("system.announcement"), anyString(), anyString(), anyMap());
        verify(audit).record(eq(1L), eq("announcement.create"), eq("announcement"), eq(9L), isNull(),
                argThat(after -> after.get("recipient_count").equals(3) && after.get("audience").equals("all")));
        verifyNoInteractions(classes, enrollments);
    }

    @Test void roleAudienceUsesTheRole() {
        when(users.findUnlockedIdsByRole("lecturer")).thenReturn(List.of(7L));
        assertThat(service.create(input(AnnouncementAudience.ROLE, " lecturer ", null), 1L).recipient_count()).isEqualTo(1);
        verify(notifications).create(eq(7L), eq("system.announcement"), anyString(), anyString(), anyMap());
    }

    @Test void roleAudienceRejectsUnknownOrMissingRole() {
        assertValidation(input(AnnouncementAudience.ROLE, "guest", null));
        assertValidation(input(AnnouncementAudience.ROLE, null, null));
        verifyNoInteractions(announcements, notifications, audit);
    }

    @Test void classAudienceIsActiveStudentsPlusUnlockedLecturerWithoutDuplicates() {
        LmsClass clazz = clazz(null);
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(enrollments.findUnlockedActiveStudentIds(3L)).thenReturn(List.of(42L, 43L));

        var created = service.create(input(AnnouncementAudience.CLASS, null, 3L), 1L);

        assertThat(created.recipient_count()).isEqualTo(3);
        verify(notifications).create(eq(7L), anyString(), anyString(), anyString(), anyMap());
        var saved = ArgumentCaptor.forClass(Announcement.class);
        verify(announcements).save(saved.capture());
        assertThat(saved.getValue().getClassId()).isEqualTo(3L);
    }

    @Test void lockedLecturerIsSkipped() {
        LmsClass clazz = clazz(null);
        clazz.getLecturer().setStatus(UserStatus.locked);
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(enrollments.findUnlockedActiveStudentIds(3L)).thenReturn(List.of(42L));
        assertThat(service.create(input(AnnouncementAudience.CLASS, null, 3L), 1L).recipient_count()).isEqualTo(1);
        verify(notifications, never()).create(eq(7L), anyString(), anyString(), anyString(), anyMap());
    }

    @Test void classAudienceRequiresAnExistingClass() {
        assertValidation(input(AnnouncementAudience.CLASS, null, null));
        when(classes.findById(99L)).thenReturn(Optional.empty());
        assertValidation(input(AnnouncementAudience.CLASS, null, 99L));
        verifyNoInteractions(announcements, notifications, audit);
    }

    private void assertValidation(AnnouncementInput input) {
        assertThatThrownBy(() -> service.create(input, 1L)).isInstanceOfSatisfying(LmsException.class,
                error -> assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR"));
    }

    private static AnnouncementInput input(AnnouncementAudience audience, String role, Long classId) {
        return new AnnouncementInput(" Bảo trì ", "Tối nay", audience, role, classId);
    }
}
