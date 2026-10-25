package vn.lmsp.mapper;

import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.TestResultStatus;
import vn.lmsp.model.*;

@Component
public class GradingMapper {
    public Accepted toAccepted(Submission submission) {
        return new Accepted(submission.getId(), submission.getStatus());
    }

    public JobMessage toJob(GradingJob job) {
        Submission submission = job.getSubmission();
        return new JobMessage(2, job.getJobId(), submission.getId(), submission.getQuestionId(),
                submission.getQuestionVersion().getId(), submission.getStudentId(), submission.getLanguage(),
                job.getAttemptNo(), job.getPriority(), job.getCreatedAt().atOffset(ZoneOffset.UTC).toString());
    }

    public SubmissionDetails toDetails(Submission submission, ResultView result) {
        return new SubmissionDetails(submission.getId(), submission.getAssignmentId(), submission.getQuestionId(),
                submission.getQuestionVersion().getId(), submission.getStudentId(), submission.getAttemptNo(),
                submission.getStatus(), submission.getScore(), submission.getLanguage(), submission.getSourceCode(),
                submission.isLate(), submission.getSubmittedAt(), result);
    }

    public ResultView toResult(GradingResult result, List<TestResult> tests,
            QuestionSnapshot snapshot, boolean includePrivateData) {
        var views = tests.stream().map(test -> toTest(test, snapshot, includePrivateData)).toList();
        String error = includePrivateData ? result.getErrorMessage()
                : "failed".equals(result.getStatus()) ? "Hệ thống chấm gặp lỗi; vui lòng liên hệ giảng viên." : null;
        return new ResultView(result.getAttemptNo(), result.getStatus(), result.getTotalScore(), result.isCompileError(),
                includePrivateData || result.isCompileError() ? result.getCompileOutput() : null,
                error, result.getGradedAt(), result.getDurationMs(), views);
    }

    private TestView toTest(TestResult result, QuestionSnapshot snapshot, boolean includePrivateData) {
        var test = snapshot.test_cases().stream().filter(item -> item.position() == result.getPosition())
                .findFirst().orElseThrow();
        if (!includePrivateData && !test.is_public()) {
            return new TestView(result.getPosition(), false,
                    result.getStatus() == TestResultStatus.passed ? "passed" : "failed",
                    null, null, null, null, null, null);
        }
        return new TestView(result.getPosition(), test.is_public(), result.getStatus().name(),
                test.input(), test.expected_output(), result.getOutput(), result.getTimeMs(),
                result.getMemoryKb(), result.getScore());
    }
}
