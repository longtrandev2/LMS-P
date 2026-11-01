package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class RegradeServiceTest {
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final GradingJobRepository jobs = mock(GradingJobRepository.class);
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final GradingNotifier notifier = mock(GradingNotifier.class);
    private final AuditService audit = mock(AuditService.class);
    private Submission submission;
    private RegradeService service;

    @BeforeEach void setup() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        when(submissions.findLockedById(90L)).thenReturn(Optional.of(submission));
        service = new RegradeService(submissions, jobs, access, new GradingMapper(), notifier, audit);
    }

    @Test void finishedCodeSubmissionGetsANewJobAndReturnsToPending() {
        var first = new GradingJob(submission, 5, LocalDateTime.now());
        submission.finish(SubmissionStatus.completed, GradingVerdict.WA);
        when(jobs.findTopBySubmission_IdOrderByAttemptNoDesc(90L)).thenReturn(Optional.of(first));

        var accepted = service.regrade(90L, 7L, false, " Sửa test ");

        var job = ArgumentCaptor.forClass(GradingJob.class);
        verify(jobs).save(job.capture());
        assertThat(job.getValue().getAttemptNo()).isEqualTo(2);
        assertThat(job.getValue().getSubmission()).isSameAs(submission);
        assertThat(accepted.status()).isEqualTo(SubmissionStatus.pending);
        assertThat(submission.getVerdict()).isNull();
        assertThat(submission.getScore()).isNull();
        verify(access).lecturerAssignment(50L, 7L, false, false);
        verify(audit).record(eq(7L), eq("submission.regrade"), eq("submission"), eq(90L), any(),
                argThat(value -> "Sửa test".equals(value.get("reason")) && Integer.valueOf(2).equals(value.get("grading_attempt"))));
        verify(notifier).afterCommit(submission, null, false);
    }

    @Test void failedSubmissionCanBeRegraded() {
        submission.finish(SubmissionStatus.failed, GradingVerdict.SYSTEM_ERROR);
        service.regrade(90L, 7L, true, "Lỗi hạ tầng");
        verify(jobs).save(argThat(job -> job.getAttemptNo() == 1));
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
    }

    @Test void submissionStillGradingIsLocked() {
        assertThatThrownBy(() -> service.regrade(90L, 7L, false, "Thử"))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getStatus().value()).isEqualTo(423));
        verifyNoInteractions(jobs);
    }

    @Test void objectiveSubmissionCannotBeRegraded() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(101, QuestionType.mcq), "1", 1);
        var objective = identified(new Submission(user(42, "student"), assignment, null, link, null, 1,
                java.math.BigDecimal.ZERO, false, "key2", LocalDateTime.now()), 91);
        when(submissions.findLockedById(91L)).thenReturn(Optional.of(objective));
        assertThatThrownBy(() -> service.regrade(91L, 7L, false, "Thử")).hasMessageContaining("bài nộp code");
    }
    @Test void bulkRegradeQueuesOnlyFailedCodeSubmissionsWithOneAudit() {
        submission.finish(SubmissionStatus.failed, GradingVerdict.SYSTEM_ERROR);
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        var completed = identified(Submission.programming(user(43, "student"), assignment, link, 1,
                "python", "print(1)", false, 0, "key3", LocalDateTime.now()), 92);
        completed.finish(SubmissionStatus.completed, GradingVerdict.AC);
        when(submissions.findLockedById(92L)).thenReturn(Optional.of(completed));
        when(submissions.findLockedById(93L)).thenReturn(Optional.empty());
        when(jobs.findTopBySubmission_IdOrderByAttemptNoDesc(90L)).thenReturn(Optional.of(new GradingJob(submission, 5, LocalDateTime.now())));

        var result = service.regradeFailed(List.of(90L, 92L, 93L), 1L, " Worker lỗi ");

        assertThat(result.queued()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(2);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.pending);
        assertThat(completed.getStatus()).isEqualTo(SubmissionStatus.completed);
        verify(jobs, times(1)).save(argThat(job -> job.getAttemptNo() == 2 && job.getSubmission() == submission));
        verify(notifier).afterCommit(submission, null, false);
        verify(audit).record(1L, "grading.bulk_regrade", "grading", 0L, null,
                Map.of("count", 1, "ids", List.of(90L), "reason", "Worker lỗi"));
        verify(audit, never()).record(any(), eq("submission.regrade"), any(), any(), any(), any());
        verifyNoInteractions(access);
    }
}
