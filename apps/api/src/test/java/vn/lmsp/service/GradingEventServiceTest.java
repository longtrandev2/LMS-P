package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
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
    private final TestResultRepository tests = mock(TestResultRepository.class);
    private final GradingNotifier notifier = mock(GradingNotifier.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private Submission submission;
    private GradingJob job;
    private GradingEventService service;

    @BeforeEach void setup() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "11", 1);
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        job = new GradingJob(submission, 5, LocalDateTime.now());
        when(submissions.findLockedById(90L)).thenReturn(Optional.of(submission));
        when(jobs.findByJobId(job.getJobId())).thenReturn(Optional.of(job));
        when(results.saveAndFlush(any())).thenAnswer(call -> identified(call.getArgument(0), 91));
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        service = new GradingEventService(submissions, jobs, results, tests, snapshots,
                new GradingScoreService(), notifier, notifications, mock(AuditService.class));
    }

    private WorkerPayload payload(SubmissionStatus status, List<WorkerTestResult> tests) {
        return new WorkerPayload(job.getJobId(), 90L, status, false, null, null, 10, tests);
    }

    @Test void terminalResultIsPersistedOnceAndLateProgressCannotDowngradeIt() {
        var payload = payload(SubmissionStatus.completed, List.of(
                new WorkerTestResult(1, TestResultStatus.passed, "3", 1, 10),
                new WorkerTestResult(2, TestResultStatus.timeout, "", 1000, 10)));
        var event = new WorkerEvent("submission.graded", payload);
        service.apply(event);
        service.apply(event);
        service.apply(new WorkerEvent("submission.status", payload(SubmissionStatus.grading, null)));

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.completed);
        assertThat(submission.getScore()).isEqualByComparingTo("1.00");
        verify(results).saveAndFlush(any());
        verify(tests, times(2)).save(any());
        verify(notifier).afterCommit(submission, payload);
        verify(notifications).create(eq(42L), any(), any(), any(), any());
    }

    @Test void invalidTestSetDoesNotChangeSubmissionOrSaveResult() {
        var event = new WorkerEvent("submission.graded", payload(SubmissionStatus.completed,
                List.of(new WorkerTestResult(1, TestResultStatus.passed, "", 1, 1))));
        assertThatThrownBy(() -> service.apply(event)).isInstanceOf(IllegalArgumentException.class);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
        verifyNoInteractions(results, tests, notifier, notifications);
    }

    @Test void infrastructureFailureHasNullScoreAndProducesOneNotification() {
        service.apply(new WorkerEvent("submission.graded", payload(SubmissionStatus.failed, null)));
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.failed);
        assertThat(submission.getScore()).isNull();
        verify(results).saveAndFlush(any());
        verifyNoInteractions(tests);
    }
}
