package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.AssignmentRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.UserRepository;

class PublishNotifierTest {
    private final AssignmentRepository assignments = mock(AssignmentRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final PublishNotifier notifier = new PublishNotifier(assignments, enrollments,
            new NotificationFanout(users, notifications), mock(PlatformTransactionManager.class));

    @Test void quizGoesOutAsAssignmentPublishedToActiveStudents() {
        Assignment quiz = published(AssignmentCategory.QUIZ);
        students(42L, 43L);

        assertThat(notifier.notifyPublished(50L)).isEqualTo(2);

        Map<String, Object> data = Map.of("assignment_id", 50L, "class_id", 3L);
        verify(notifications).create(eq(42L), eq("assignment.published"), eq("Bài tập mới: Bài 01"), contains("Hạn nộp"), eq(data));
        verify(notifications).create(eq(43L), eq("assignment.published"), anyString(), anyString(), eq(data));
        verify(users).findAllById(any());
        verifyNoMoreInteractions(notifications);
        assertThat(quiz.isPublished()).isTrue();
    }

    @Test void midtermGoesOutAsExamPublished() {
        published(AssignmentCategory.MIDTERM);
        students(42L);

        notifier.notifyPublished(50L);

        verify(notifications).create(eq(42L), eq("exam.published"), eq("Kỳ thi mới: Bài 01"), contains("Đóng lúc"), anyMap());
    }

    @Test void draftOrMissingAssignmentNotifiesNobody() {
        when(assignments.findById(50L)).thenReturn(Optional.of(assignment(AssignmentCategory.QUIZ)));
        assertThat(notifier.notifyPublished(50L)).isZero();
        when(assignments.findById(50L)).thenReturn(Optional.empty());
        assertThat(notifier.notifyPublished(50L)).isZero();
        verifyNoInteractions(notifications, enrollments);
    }

    @Test void afterCommitFailureDoesNotPropagate() {
        when(assignments.findById(50L)).thenThrow(new IllegalStateException("db down"));
        assertThatCode(() -> notifier.onPublished(new AssignmentPublishedEvent(50L))).doesNotThrowAnyException();
    }

    private Assignment published(AssignmentCategory category) {
        Assignment item = assignment(category);
        item.publish();
        when(assignments.findById(50L)).thenReturn(Optional.of(item));
        return item;
    }

    private void students(Long... ids) {
        List<EnrollmentRepository.ClassStudent> rows = java.util.Arrays.stream(ids).map(id -> row(3L, id)).toList();
        when(enrollments.findStudentIdsByClassIds(List.of(3L), EnrollmentStatus.active)).thenReturn(rows);
    }

    static EnrollmentRepository.ClassStudent row(Long classId, Long studentId) {
        return new EnrollmentRepository.ClassStudent() {
            public Long getClassId() { return classId; }
            public Long getStudentId() { return studentId; }
        };
    }
}
