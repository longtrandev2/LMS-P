package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScorePolicy;

public final class AssignmentDtos {
    private AssignmentDtos() { }
    public record AssignmentInput(@NotBlank @Size(max=200) String title, String description,
            @NotNull AssignmentCategory category, LocalDateTime available_from, @NotNull LocalDateTime due_at,
            Boolean allow_late, LocalDateTime late_due_at, @Min(0) @Max(100) Integer late_penalty_percent,
            @Min(1) Integer max_attempts, ScorePolicy score_policy, @Valid List<QuestionSelectionInput> questions) { }
    public record QuestionSelectionInput(@NotNull Long question_id, @NotNull @DecimalMin("0.01") @DecimalMax("9999.99") BigDecimal points,
                                         @Min(1) Integer position) { }
    public record QuizAnswerInput(@NotNull Long question_id, List<Long> selected_option_ids) { }
    public record QuizSubmitInput(@Valid List<QuizAnswerInput> answers) { }
    public record QuestionSubmissionInput(List<Long> selected_option_ids) { }
    public record AssignmentSummary(Long id, Long class_id, String title, String description, AssignmentCategory category,
            LocalDateTime available_from, LocalDateTime due_at, boolean allow_late, LocalDateTime late_due_at,
            int late_penalty_percent, Integer max_attempts, ScorePolicy score_policy, boolean is_published,
            int question_count, BigDecimal total_points, LocalDateTime created_at, LocalDateTime updated_at) { }
    public record AssignmentOptionView(Long id, String content, Boolean is_correct) { }
    public record AssignmentQuestionView(Long question_id, Long question_version_id, QuestionType type, String content,
            String topic, QuestionDifficulty difficulty, BigDecimal points, int position,
            List<AssignmentOptionView> options, String starter_code, List<String> allowed_languages,
            Integer time_limit_ms, Integer memory_limit_mb, List<vn.lmsp.dto.QuestionDtos.TestCaseView> test_cases) { }
    public record AssignmentDetails(AssignmentSummary assignment, List<AssignmentQuestionView> questions) { }
    public record QuestionScore(Long question_id, BigDecimal score, BigDecimal max_score, List<Long> selected_option_ids) { }
    public record QuizAttemptView(Long attempt_id, int attempt_no, BigDecimal score, boolean is_late,
            int late_penalty_percent, LocalDateTime submitted_at, List<QuestionScore> question_scores) { }
    public record SubmissionView(Long id, Long assignment_id, Long student_id, Long question_id, int attempt_no,
            List<Long> selected_option_ids, BigDecimal score, boolean is_late, LocalDateTime submitted_at) { }
    public record AssignmentPage(List<AssignmentSummary> items, long total, int page, int limit) { }
}
