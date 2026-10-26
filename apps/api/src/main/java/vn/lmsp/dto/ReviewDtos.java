package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.SubmissionStatus;

/** Lượt quiz, xem lại và bảng kết quả — docs/api-spec.md §6, docs/assessment-spec.md §6. */
public final class ReviewDtos {
    private ReviewDtos() { }

    public record QuestionScore(Long question_id, BigDecimal score, BigDecimal max_score) { }

    /** `question_scores` là `null` khi chưa được xem lại. */
    public record QuizAttemptView(Long attempt_id, int attempt_no, BigDecimal score, BigDecimal max_score,
            boolean is_late, int late_penalty_percent, LocalDateTime submitted_at, boolean review_available,
            LocalDateTime review_available_at, List<QuestionScore> question_scores) { }

    /** Đáp án đúng theo loại; chỉ trường của loại câu khác null. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CorrectAnswer(List<Long> option_ids, List<String> accepted, Boolean case_sensitive, BigDecimal value,
                                BigDecimal tolerance, List<List<String>> blanks, List<Boolean> blanks_case_sensitive,
                                Map<String, String> matches, List<String> order) { }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReviewQuestion(AssignmentQuestionView question, AnswerResponse response, BigDecimal score,
                                 BigDecimal max_score, CorrectAnswer correct_answer, String explanation) { }

    /** Khi chưa được xem lại: `questions` rỗng. */
    public record AttemptReview(QuizAttemptView attempt, boolean review_available, boolean shows_answers,
                                List<ReviewQuestion> questions) { }

    public record AttemptResult(Long attempt_id, int attempt_no, BigDecimal score, boolean is_late,
                                LocalDateTime submitted_at) { }

    public record QuestionResult(Long question_id, BigDecimal final_score, int attempt_count,
                                 SubmissionStatus last_status, GradingVerdict last_verdict) { }

    /** `attempts` chỉ có với quiz. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StudentResult(Long student_id, String student_full_name, String student_code, BigDecimal final_score,
                                BigDecimal max_score, int attempt_count, List<AttemptResult> attempts,
                                List<QuestionResult> questions) { }

    public record ResultsTable(List<StudentResult> items) { }
}
