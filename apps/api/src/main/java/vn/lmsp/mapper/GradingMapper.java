package vn.lmsp.mapper;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.dto.ReviewDtos.CorrectAnswer;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.model.GradingJob;
import vn.lmsp.model.GradingResult;
import vn.lmsp.model.Submission;
import vn.lmsp.model.TestResult;

@Component
public class GradingMapper {
    public Accepted toAccepted(Submission submission) {
        return new Accepted(submission.getId(), submission.getStatus());
    }

    public JobMessage toJob(GradingJob job) {
        Submission submission = job.getSubmission();
        return new JobMessage(3, job.getJobId(), submission.getId(), submission.getQuestionId(),
                submission.getQuestionVersion().getId(), submission.getStudentId(), submission.getLanguage(),
                job.getAttemptNo(), job.getPriority(), job.getCreatedAt().atOffset(ZoneOffset.UTC).toString());
    }

    /** `results` mới nhất trước; câu khách quan ẩn điểm/câu trả lời khi `reviewAvailable=false`. */
    public SubmissionDetails toDetails(Submission submission, List<ResultView> results, boolean reviewAvailable,
                                       CorrectAnswer correctAnswer, String explanation) {
        boolean hide = submission.getType() == SubmissionType.mcq && !reviewAvailable;
        return new SubmissionDetails(submission.getId(), submission.getAssignmentId(), submission.getQuestionId(),
                submission.getQuestionVersion().getId(), submission.getStudentId(), submission.getAttemptNo(),
                submission.getType(), submission.getStatus(), submission.getVerdict(), hide ? null : submission.getScore(),
                submission.getMaxScore(), submission.getLanguage(), submission.getSourceCode(),
                hide ? null : SubmissionMapper.storedResponse(submission), submission.isLate(), submission.getSubmittedAt(),
                results.isEmpty() ? null : results.getFirst(), results,
                submission.getType() == SubmissionType.code || reviewAvailable, correctAnswer, explanation);
    }

    /**
     * Kết quả một lần chấm. Input/expected lấy từ snapshot đã ghim; sinh viên chỉ nhận dữ liệu của test công khai,
     * không nhận log lỗi hệ thống.
     */
    public ResultView toResult(GradingResult result, List<TestResult> tests, List<TestCaseView> cases,
                               boolean includePrivateData) {
        String error = includePrivateData ? result.getErrorMessage()
                : "failed".equals(result.getStatus()) ? "Hệ thống chấm gặp lỗi; vui lòng liên hệ giảng viên." : null;
        Map<Integer, TestCaseView> byPosition = cases == null ? Map.of()
                : cases.stream().collect(Collectors.toMap(TestCaseView::position, Function.identity(), (first, last) -> first));
        var testViews = tests.stream().map(test -> toTest(test, byPosition.get(test.getPosition()), includePrivateData)).toList();
        return new ResultView(result.getAttemptNo(), result.getStatus(), result.getVerdict(), result.isCompileError(),
                includePrivateData || result.isCompileError() ? result.getCompileOutput() : null,
                error, result.getGradedAt(), result.getDurationMs(), result.getTestsTotal(), result.getTestsPassed(),
                result.getFailedTest(), testViews);
    }

    private TestView toTest(TestResult test, TestCaseView testCase, boolean includePrivateData) {
        boolean isPublic = testCase != null && testCase.is_public();
        boolean reveal = includePrivateData || isPublic;
        return new TestView(test.getPosition(), isPublic, test.getStatus(), test.getTimeMs(), test.getMemoryKb(),
                reveal && testCase != null ? testCase.input() : null,
                reveal && testCase != null ? testCase.expected_output() : null, reveal ? test.getOutput() : null);
    }
}
