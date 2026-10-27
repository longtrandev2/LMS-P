package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.service.PublishNotifierTest.row;
import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.AssignmentNotificationRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.UserRepository;

class ExamNotificationServiceTest {
    private final AssignmentNotificationRepository assignments = mock(AssignmentNotificationRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final ExamNotificationService service = new ExamNotificationService(assignments, enrollments,
            new NotificationFanout(mock(UserRepository.class), notifications));

    @Test void upcomingLooksThirtyMinutesAheadForExamsOnly() {
        when(assignments.findUpcomingToNotify(any(), any())).thenReturn(List.of());
        LocalDateTime before = UtcTime.now();
        service.sendUpcoming();
        var categories = ArgumentCaptor.forClass(Collection.class);
        var until = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(assignments).findUpcomingToNotify(categories.capture(), until.capture());
        assertThat(categories.getValue()).containsExactlyInAnyOrder(AssignmentCategory.MIDTERM, AssignmentCategory.FINAL);
        assertThat(until.getValue()).isBetween(before.plusMinutes(30), UtcTime.now().plusMinutes(30));
        verifyNoInteractions(notifications, enrollments);
    }

    @Test void upcomingNotifiesActiveStudentsOnceUsingTheMarker() {
        Assignment exam = exam(51, UtcTime.now().plusMinutes(20));
        when(assignments.findUpcomingToNotify(any(), any())).thenReturn(List.of(exam));
        when(assignments.markUpcomingNotified(eq(51L), any())).thenReturn(1, 0);
        when(enrollments.findStudentIdsByClassIds(anyCollection(), eq(EnrollmentStatus.active)))
                .thenReturn(List.of(row(3L, 42L), row(3L, 43L)));

        assertThat(service.sendUpcoming()).isEqualTo(1);
        assertThat(service.sendUpcoming()).isZero();

        verify(notifications).create(eq(42L), eq("exam.upcoming"), eq("Kỳ thi sắp bắt đầu: Bài 01"), contains("Bắt đầu lúc"),
                eq(java.util.Map.of("assignment_id", 51L, "class_id", 3L)));
        verify(notifications).create(eq(43L), eq("exam.upcoming"), anyString(), anyString(), anyMap());
        verify(enrollments, times(1)).findStudentIdsByClassIds(anyCollection(), any());
        verifyNoMoreInteractions(notifications);
    }

    @Test void examOpenedLongAgoIsOnlyMarked() {
        Assignment old = exam(52, UtcTime.now().minusMinutes(31));
        when(assignments.findUpcomingToNotify(any(), any())).thenReturn(List.of(old));
        when(assignments.markUpcomingNotified(eq(52L), any())).thenReturn(1);

        assertThat(service.sendUpcoming()).isZero();

        verify(assignments).markUpcomingNotified(eq(52L), any());
        verifyNoInteractions(notifications, enrollments);
    }

    @Test void resultsGoOnlyToStudentsWithAnAttempt() {
        Assignment quiz = closed(53, AssignmentCategory.QUIZ, ReviewMode.after_close);
        when(assignments.findClosedToRelease(any(), any())).thenReturn(List.of(quiz));
        when(assignments.markResultsNotified(eq(53L), any())).thenReturn(1, 0);
        when(assignments.findSubmitters(List.of(53L))).thenReturn(List.of(submitter(53L, 42L)));

        assertThat(service.releaseResults()).isEqualTo(1);
        assertThat(service.releaseResults()).isZero();

        verify(notifications).create(eq(42L), eq("grade.released"), eq("Đã có kết quả: Bài 01"), anyString(),
                eq(java.util.Map.of("assignment_id", 53L, "class_id", 3L)));
        verifyNoMoreInteractions(notifications);
        verifyNoInteractions(enrollments);
    }

    @Test void resultsQueryCoversClosedReviewableCategoriesAndSkipsOtherReviewModes() {
        Assignment instant = closed(54, AssignmentCategory.FINAL, ReviewMode.after_submit);
        when(assignments.findClosedToRelease(any(), any())).thenReturn(List.of(instant));
        when(assignments.markResultsNotified(eq(54L), any())).thenReturn(1);
        LocalDateTime before = UtcTime.now();

        assertThat(service.releaseResults()).isZero();

        var categories = ArgumentCaptor.forClass(Collection.class);
        var closedBy = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(assignments).findClosedToRelease(categories.capture(), closedBy.capture());
        assertThat(categories.getValue()).containsExactlyInAnyOrder(AssignmentCategory.QUIZ, AssignmentCategory.MIDTERM,
                AssignmentCategory.FINAL);
        assertThat(closedBy.getValue()).isBeforeOrEqualTo(UtcTime.now()).isAfterOrEqualTo(before.minusMinutes(1));
        verify(assignments, never()).findSubmitters(any());
        verifyNoInteractions(notifications);
    }

    private static Assignment exam(long id, LocalDateTime opensAt) {
        Assignment exam = identified(assignment(AssignmentCategory.MIDTERM), id);
        ReflectionTestUtils.setField(exam, "availableFrom", opensAt);
        ReflectionTestUtils.setField(exam, "dueAt", opensAt.plusHours(2));
        exam.publish();
        return exam;
    }

    private static Assignment closed(long id, AssignmentCategory category, ReviewMode mode) {
        Assignment item = identified(assignment(category), id);
        ReflectionTestUtils.setField(item, "dueAt", UtcTime.now().minusMinutes(5));
        ReflectionTestUtils.setField(item, "reviewMode", mode);
        item.publish();
        return item;
    }

    private static AssignmentNotificationRepository.Submitter submitter(Long assignmentId, Long studentId) {
        return new AssignmentNotificationRepository.Submitter() {
            public Long getAssignmentId() { return assignmentId; }
            public Long getStudentId() { return studentId; }
        };
    }
}
