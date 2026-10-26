package vn.lmsp.mapper;

import java.time.ZoneOffset;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.GradingDtos.*;
import vn.lmsp.model.GradingJob;
import vn.lmsp.model.GradingResult;
import vn.lmsp.model.Submission;

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

    public SubmissionDetails toDetails(Submission submission, ResultView result) {
        return new SubmissionDetails(submission.getId(), submission.getAssignmentId(), submission.getQuestionId(),
                submission.getQuestionVersion().getId(), submission.getStudentId(), submission.getAttemptNo(),
                submission.getStatus(), submission.getVerdict(), submission.getScore(), submission.getLanguage(),
                submission.getSourceCode(), submission.isLate(), submission.getSubmittedAt(), result);
    }

    public ResultView toResult(GradingResult result, boolean includePrivateData) {
        String error = includePrivateData ? result.getErrorMessage()
                : "failed".equals(result.getStatus()) ? "Hệ thống chấm gặp lỗi; vui lòng liên hệ giảng viên." : null;
        return new ResultView(result.getAttemptNo(), result.getStatus(), result.getVerdict(), result.isCompileError(),
                includePrivateData || result.isCompileError() ? result.getCompileOutput() : null,
                error, result.getGradedAt(), result.getDurationMs());
    }
}
