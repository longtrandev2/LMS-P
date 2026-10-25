package vn.lmsp.mapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.model.AssignmentAttempt;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.Submission;

@Component
public class SubmissionMapper {
    public SubmissionView toView(Submission submission) {
        return new SubmissionView(submission.getId(), submission.getAssignmentId(), submission.getStudentId(),
                submission.getQuestionId(), submission.getAttemptNo(), submission.getSelectedOptionIds(),
                submission.getScore(), submission.isLate(), submission.getSubmittedAt());
    }

    public QuizAttemptView toAttemptView(AssignmentAttempt attempt, List<AssignmentQuestion> questions,
            List<Submission> submissions) {
        Map<Long, Submission> answers = submissions.stream().collect(
                Collectors.toMap(Submission::getQuestionId, Function.identity(), (first, last) -> last));
        var scores = questions.stream().map(question -> toQuestionScore(question, answers.get(question.getQuestionId())))
                .toList();
        return new QuizAttemptView(attempt.getId(), attempt.getAttemptNo(), attempt.getScore(), attempt.isLate(),
                attempt.getLatePenaltyPercent(), attempt.getSubmittedAt(), scores);
    }

    private QuestionScore toQuestionScore(AssignmentQuestion question, Submission submission) {
        return new QuestionScore(question.getQuestionId(), submission == null ? BigDecimal.ZERO : submission.getScore(),
                question.getPoints(), submission == null ? null : submission.getSelectedOptionIds());
    }
}
