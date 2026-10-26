package vn.lmsp.mapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AssignmentDtos.SubmissionView;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.ReviewDtos.QuestionScore;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.model.AssignmentAttempt;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.Submission;

@Component
public class SubmissionMapper {
    /**
     * `reviewAvailable=false` ẩn điểm và câu trả lời của câu khách quan (docs/assessment-spec.md §6);
     * bài code luôn hiện verdict/điểm.
     */
    public SubmissionView toView(Submission submission, boolean reviewAvailable) {
        boolean hide = submission.getType() == SubmissionType.mcq && !reviewAvailable;
        AnswerResponse response = hide ? null : storedResponse(submission);
        return new SubmissionView(submission.getId(), submission.getAssignmentId(), submission.getStudentId(),
                submission.getStudentFullName(), submission.getStudentCode(),
                submission.getQuestionId(), submission.getAttemptNo(),
                hide ? null : submission.getSelectedOptionIds(), response, hide ? null : submission.getScore(),
                submission.getMaxScore(), submission.isLate(), submission.getSubmittedAt(),
                submission.getStatus(), submission.getType(), submission.getLanguage(), submission.getVerdict(),
                submission.getType() == SubmissionType.code || reviewAvailable);
    }

    public QuizAttemptView toAttemptView(AssignmentAttempt attempt, List<AssignmentQuestion> questions,
            List<Submission> submissions, boolean reviewAvailable, LocalDateTime reviewAvailableAt) {
        BigDecimal maxScore = questions.stream().map(AssignmentQuestion::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<QuestionScore> scores = null;
        if (reviewAvailable) {
            Map<Long, Submission> answers = byQuestion(submissions);
            scores = questions.stream().map(question -> {
                Submission answer = answers.get(question.getQuestionId());
                return new QuestionScore(question.getQuestionId(),
                        answer == null || answer.getScore() == null ? BigDecimal.ZERO : answer.getScore(), question.getPoints());
            }).toList();
        }
        return new QuizAttemptView(attempt.getId(), attempt.getAttemptNo(), attempt.getScore(), maxScore, attempt.isLate(),
                attempt.getLatePenaltyPercent(), attempt.getSubmittedAt(), reviewAvailable, reviewAvailableAt, scores);
    }

    public static Map<Long, Submission> byQuestion(List<Submission> submissions) {
        return submissions.stream().collect(Collectors.toMap(Submission::getQuestionId, Function.identity(), (first, last) -> last));
    }

    /** Câu trả lời đã lưu; dòng cũ (trước V18) chỉ có `selected_option_ids`. */
    public static AnswerResponse storedResponse(Submission submission) {
        if (submission.getResponse() != null) return submission.getResponse();
        List<Long> selected = submission.getSelectedOptionIds();
        return selected == null || selected.isEmpty() ? null
                : new AnswerResponse(selected.stream().sorted().toList(), null, null, null, null, null);
    }
}
