package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class GradingEventServiceTest {
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final GradingJobRepository jobs = mock(GradingJobRepository.class);
    private final GradingResultRepository results = mock(GradingResultRepository.class);
    private final GradingNotifier notifier = mock(GradingNotifier.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private Submission submission;
    private GradingJob job;
    private GradingEventService service;

    @BeforeEach void setup() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "11", 1);
        submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        job = new GradingJob(submission, 5, LocalDateTime.now());
        when(submissions.findLockedById(90L)).thenReturn(Optional.of(submission));
        when(jobs.findByJobId(job.getJobId())).thenReturn(Optional.of(job));
        when(results.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        service = new GradingEventService(submissions, jobs, results, notifier, notifications, mock(AuditService.class));
    }

    private WorkerPayload payload(SubmissionStatus status, GradingVerdict verdict) {
        return new WorkerPayload(job.getJobId(), 90L, status, verdict, false, null, null, 10);
    }

    @Test void persistsOneVerdictAndIgnoresDuplicatesAndLateProgress() {
        var event = new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, GradingVerdict.AC));
        service.apply(event);
        service.apply(event);
        service.apply(new WorkerEvent("submission.status", payload(SubmissionStatus.grading, null)));

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.completed);
        assertThat(submission.getVerdict()).isEqualTo(GradingVerdict.AC);
        assertThat(submission.getScore()).isNull();
        verify(results).saveAndFlush(any());
        verify(notifier).afterCommit(submission, event.payload());
        verify(notifications).create(eq(42L), any(), any(), any(), any());
    }

    @Test void rejectsCompletedResultWithoutCodeVerdict() {
        var event = new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, null));
        assertThatThrownBy(() -> service.apply(event)).isInstanceOf(IllegalArgumentException.class);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
        verifyNoInteractions(results, notifier, notifications);
    }

    @Test void systemFailureHasNoVerdictScoreAndCreatesNotification() {
        service.apply(new WorkerEvent("submission.graded", payload(SubmissionStatus.failed, GradingVerdict.SYSTEM_ERROR)));
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.failed);
        assertThat(submission.getVerdict()).isEqualTo(GradingVerdict.SYSTEM_ERROR);
        assertThat(submission.getScore()).isNull();
        verify(results).saveAndFlush(any());
        verify(notifications).create(eq(42L), any(), any(), any(), any());
    }
}
