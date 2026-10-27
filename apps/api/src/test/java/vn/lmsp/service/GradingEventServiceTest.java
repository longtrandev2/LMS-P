package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class GradingEventServiceTest {
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final GradingJobRepository jobs = mock(GradingJobRepository.class);
    private final GradingResultRepository results = mock(GradingResultRepository.class);
    private final TestResultRepository testResults = mock(TestResultRepository.class);
    private final GradingNotifier notifier = mock(GradingNotifier.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private Submission submission;
    private GradingJob job;
    private GradingEventService service;

    @BeforeEach void setup() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "11", 1);
        submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", true, 20, "key", LocalDateTime.now()), 90);
        job = new GradingJob(submission, 5, LocalDateTime.now());
        when(submissions.findLockedById(90L)).thenReturn(Optional.of(submission));
        when(jobs.findByJobId(job.getJobId())).thenReturn(Optional.of(job));
        when(results.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        service = new GradingEventService(submissions, jobs, results, testResults, notifier, notifications, mock(AuditService.class),
                new AttemptScoreRefresher(submissions, attempts));
    }

    private WorkerPayload payload(SubmissionStatus status, GradingVerdict verdict) {
        return new WorkerPayload(job.getJobId(), 90L, status, verdict, false, null, null, 10);
    }

    @Test void acceptedSubmissionScoresPointsAfterLatePenaltyAndIgnoresDuplicates() {
        var event = new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, GradingVerdict.AC));
        service.apply(event);
        service.apply(event);
        service.apply(new WorkerEvent("submission.status", payload(SubmissionStatus.grading, null)));

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.completed);
        assertThat(submission.getVerdict()).isEqualTo(GradingVerdict.AC);
        assertThat(submission.getScore()).isEqualByComparingTo("8.80");
        verify(results).saveAndFlush(any());
        verify(notifier).afterCommit(submission, GradingVerdict.AC, false);
        verify(notifications).create(eq(42L), any(), any(), any(), any());
    }

    @Test void wrongAnswerScoresZeroAndStoresPerTestResults() {
        var tests = List.of(new WorkerTest(1, GradingVerdict.AC, 12, null, "3"),
                new WorkerTest(2, GradingVerdict.OLE, 30, 2048, "x".repeat(5000)));
        service.apply(new WorkerEvent("submission.graded", new WorkerPayload(job.getJobId(), 90L,
                SubmissionStatus.completed, GradingVerdict.OLE, false, null, null, 40, 5, 1, 2, tests)));

        assertThat(submission.getScore()).isEqualByComparingTo("0");
        var result = ArgumentCaptor.forClass(GradingResult.class);
        verify(results).saveAndFlush(result.capture());
        assertThat(result.getValue().getTestsTotal()).isEqualTo(5);
        assertThat(result.getValue().getFailedTest()).isEqualTo(2);
        var saved = ArgumentCaptor.forClass(TestResult.class);
        verify(testResults, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(TestResult::getStatus).containsExactly(GradingVerdict.AC, GradingVerdict.OLE);
        assertThat(saved.getAllValues().get(1).getOutput()).hasSize(4096);
    }

    @Test void eventsFromASupersededJobAreIgnored() {
        var newer = new GradingJob(submission, 5, 2, LocalDateTime.now());
        when(jobs.findTopBySubmission_IdOrderByAttemptNoDesc(90L)).thenReturn(Optional.of(newer));

        service.apply(new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, GradingVerdict.AC)));

        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
        verifyNoInteractions(results, notifier, notifications);
    }

    @Test void rejectsCompletedResultWithoutCodeVerdict() {
        var event = new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, null));
        assertThatThrownBy(() -> service.apply(event)).isInstanceOf(IllegalArgumentException.class);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
        verifyNoInteractions(results, notifier, notifications);
    }

    @Test void systemFailureHasNoScoreAndCreatesNotification() {
        service.apply(new WorkerEvent("submission.graded", payload(SubmissionStatus.failed, GradingVerdict.SYSTEM_ERROR)));
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.failed);
        assertThat(submission.getVerdict()).isEqualTo(GradingVerdict.SYSTEM_ERROR);
        assertThat(submission.getScore()).isNull();
        verify(results).saveAndFlush(any());
        verify(notifications).create(eq(42L), any(), any(), any(), any());
    }

    @Test void gradedCodeOfASessionAttemptRecomputesTheAttemptScore() {
        var exam = assignment(AssignmentCategory.MIDTERM);
        var student = user(42, "student");
        var attempt = identified(new AssignmentAttempt(exam, student, 1, false, 0, new BigDecimal("2.00"), "k", LocalDateTime.now()), 70);
        var codeLink = link(exam, question(101, QuestionType.programming), "6", 2);
        var code = identified(Submission.programmingInAttempt(student, exam, attempt, codeLink, "python", "x", LocalDateTime.now()), 91);
        var objective = new Submission(student, exam, attempt, link(exam, question(100, QuestionType.mcq), "2", 1), null, 1,
                new BigDecimal("2.00"), false, null, LocalDateTime.now());
        var other = identified(Submission.programmingInAttempt(student, exam, attempt,
                link(exam, question(102, QuestionType.programming), "4", 3), "python", "y", LocalDateTime.now()), 92);
        var codeJob = new GradingJob(code, 10, LocalDateTime.now());
        when(submissions.findLockedById(91L)).thenReturn(Optional.of(code));
        when(jobs.findByJobId(codeJob.getJobId())).thenReturn(Optional.of(codeJob));
        when(submissions.findAttemptIdById(91L)).thenReturn(70L);
        when(attempts.findForUpdate(70L)).thenReturn(Optional.of(attempt));
        when(submissions.findLockedByAttempt(70L)).thenReturn(List.of(objective, code, other));

        service.apply(new WorkerEvent("submission.graded", new WorkerPayload(codeJob.getJobId(), 91L,
                SubmissionStatus.completed, GradingVerdict.AC, false, null, null, 10)));

        assertThat(code.getScore()).isEqualByComparingTo("6");
        assertThat(attempt.getScore()).isEqualByComparingTo("8.00"); // 2 + 6, bài code còn chờ chấm không tính
        var order = inOrder(attempts, submissions);
        order.verify(attempts).findForUpdate(70L);
        order.verify(submissions).findLockedById(91L);
    }

    @Test void standaloneCodeSubmissionsDoNotTouchAttempts() {
        when(submissions.findAttemptIdById(90L)).thenReturn(null);
        service.apply(new WorkerEvent("submission.graded", payload(SubmissionStatus.completed, GradingVerdict.AC)));
        verifyNoInteractions(attempts);
    }
}
