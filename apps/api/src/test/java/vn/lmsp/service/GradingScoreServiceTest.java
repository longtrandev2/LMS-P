package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.Submission;

class GradingScoreServiceTest {
    private final GradingScoreService scores = new GradingScoreService();
    private final vn.lmsp.dto.QuestionDtos.QuestionSnapshot snapshot = programmingSnapshot();

    private Submission submission() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "11", 1);
        link.pin(version(link.getQuestion(), 1, snapshot));
        return Submission.programming(user(42, "student"), assignment, link, 1, "python", "print(3)", true, 20,
                "12345678-1234-1234-1234-123456789abc", LocalDateTime.now());
    }

    private WorkerPayload payload(SubmissionStatus status, boolean compileError, List<WorkerTestResult> tests) {
        return new WorkerPayload("12345678-1234-1234-1234-123456789abc", 1L, status, compileError, null, null, 10, tests);
    }

    @Test void calculatesWeightRatioAndCapturedLatePenalty() {
        var result = scores.score(submission(), snapshot, payload(SubmissionStatus.completed, false, List.of(
                new WorkerTestResult(1, TestResultStatus.passed, "3", 1, 10),
                new WorkerTestResult(2, TestResultStatus.wrong_answer, "x", 1, 10))));
        assertThat(result.total()).isEqualByComparingTo("0.80");
        assertThat(result.tests().get(2)).isEqualByComparingTo("0");
    }

    @Test void rejectsIncompleteDuplicateAndForeignTestPositions() {
        var first = new WorkerTestResult(1, TestResultStatus.passed, "", 1, 1);
        assertThatThrownBy(() -> scores.score(submission(), snapshot,
                payload(SubmissionStatus.completed, false, List.of(first)))).hasMessageContaining("Thiếu");
        assertThatThrownBy(() -> scores.score(submission(), snapshot,
                payload(SubmissionStatus.completed, false, List.of(first, first)))).hasMessageContaining("trùng");
        assertThatThrownBy(() -> scores.score(submission(), snapshot,
                payload(SubmissionStatus.completed, false, List.of(first,
                        new WorkerTestResult(99, TestResultStatus.passed, "", 1, 1))))).hasMessageContaining("snapshot");
    }

    @Test void compilationFailureIsCompletedZeroAndInfrastructureFailureHasNoGrade() {
        assertThat(scores.score(submission(), snapshot, payload(SubmissionStatus.completed, true, null)).total()).isZero();
        assertThat(scores.score(submission(), snapshot, payload(SubmissionStatus.failed, false, null)).total()).isNull();
    }
}
