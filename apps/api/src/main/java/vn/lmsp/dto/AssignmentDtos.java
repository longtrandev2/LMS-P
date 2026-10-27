package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.enums.ScorePolicy;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;

public final class AssignmentDtos {
    private AssignmentDtos() { }
    public record AssignmentInput(@NotBlank @Size(max=200) String title, String description,
            @NotNull AssignmentCategory category, LocalDateTime available_from, @NotNull LocalDateTime due_at,
            Boolean allow_late, LocalDateTime late_due_at, @Min(0) @Max(100) Integer late_penalty_percent,
            @Min(1) Integer max_attempts, ScorePolicy score_policy, @Valid List<QuestionSelectionInput> questions,
            ReviewMode review_mode, Boolean review_shows_answers, Boolean shuffle_questions, Boolean shuffle_options,
            @Min(1) @Max(600) Integer time_limit_minutes, PaperMode paper_mode, @Min(2) @Max(20) Integer variant_count,
            @Size(max = 10000) String rules_text, @Size(max = 20) List<@NotNull @Valid SectionInput> sections,
            @Size(max = 50) List<@NotNull @Valid DrawRuleInput> draw_rules) {
        public AssignmentInput(String title, String description, AssignmentCategory category, LocalDateTime available_from,
                LocalDateTime due_at, Boolean allow_late, LocalDateTime late_due_at, Integer late_penalty_percent,
                Integer max_attempts, ScorePolicy score_policy, List<QuestionSelectionInput> questions) {
            this(title, description, category, available_from, due_at, allow_late, late_due_at, late_penalty_percent,
                    max_attempts, score_policy, questions, null, null, null, null, null, null, null, null, null, null);
        }
    }
    /** Phần của đề — docs/exam-spec.md §3.1; thứ tự trong mảng = vị trí. */
    public record SectionInput(@NotBlank @Size(max = 200) String title) { }
    /** Quy tắc bốc ngẫu nhiên — exam-spec.md §3.2. `section_index` trỏ vào `sections` của cùng request. */
    public record DrawRuleInput(@Min(0) Integer section_index, @Min(1) @Max(20) Integer variant_no, @NotNull Long bank_id,
            Long category_id, QuestionDifficulty difficulty, QuestionType type, @NotNull @Min(1) @Max(100) Integer count,
            @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal points) { }
    /** `review_mode`/`review_shows_answers` vắng = giữ nguyên giá trị hiện tại. */
    public record PublishedSettingsInput(@NotBlank @Size(max=200) String title, String description,
            LocalDateTime available_from, @NotNull LocalDateTime due_at, @NotNull Boolean allow_late,
            LocalDateTime late_due_at, @NotNull @Min(0) @Max(100) Integer late_penalty_percent,
            @NotBlank @Size(max=500) String reason, ReviewMode review_mode, Boolean review_shows_answers,
            @Size(max = 10000) String rules_text) { }
    public record BulkAssignmentInput(@NotEmpty List<@NotNull Long> class_ids,
                                      @NotNull @Valid AssignmentInput assignment, boolean publish, Boolean confirm_unverified) { }
    /** Body tùy chọn của `POST /assignments/{id}/publish`. */
    public record PublishInput(Boolean confirm_unverified) { }
    /** Câu cố định; `section_index`/`variant_no` vắng = phần đầu / mọi mã đề (exam-spec.md §3.2). */
    public record QuestionSelectionInput(@NotNull Long question_id, @NotNull @DecimalMin("0.01") @DecimalMax("9999.99") BigDecimal points,
                                         @Min(1) Integer position, @Min(0) Integer section_index, @Min(1) @Max(20) Integer variant_no) {
        public QuestionSelectionInput(Long question_id, BigDecimal points, Integer position) {
            this(question_id, points, position, null, null);
        }
    }
    public record QuizSubmitInput(@Size(max = 500) List<@NotNull @Valid AnswerInput> answers) { }
    /** Nộp từng câu: trường `Answer` (câu khách quan) hoặc `{language, source_code}` (code). */
    public record QuestionSubmissionInput(Long question_id,
            @Size(max = 8) List<@NotNull Long> selected_option_ids, @Size(max = 1000) String text, BigDecimal number,
            @Size(max = 20) List<@NotNull @Size(max = 200) String> blanks,
            @Size(max = 12) Map<@NotBlank String, @NotBlank String> matches, @Size(max = 12) List<@NotBlank String> order,
            String language, String source_code) {
        public QuestionSubmissionInput(List<Long> selectedOptionIds) { this(selectedOptionIds, null, null); }
        public QuestionSubmissionInput(List<Long> selectedOptionIds, String language, String sourceCode) {
            this(null, selectedOptionIds, null, null, null, null, null, language, sourceCode);
        }
        public boolean isCode() { return language != null || source_code != null; }
        public boolean hasAnswerFields() {
            return selected_option_ids != null || text != null || number != null || blanks != null
                    || matches != null || order != null;
        }
        public AnswerInput toAnswer(Long questionId) {
            return new AnswerInput(questionId, selected_option_ids, text, number, blanks, matches, order);
        }
    }
    public record AssignmentSummary(Long id, Long class_id, String title, String description, AssignmentCategory category,
            LocalDateTime available_from, LocalDateTime due_at, boolean allow_late, LocalDateTime late_due_at,
            int late_penalty_percent, Integer max_attempts, ScorePolicy score_policy, ReviewMode review_mode,
            boolean review_shows_answers, boolean shuffle_questions, boolean shuffle_options, boolean is_published,
            int question_count, BigDecimal total_points, LocalDateTime created_at, LocalDateTime updated_at,
            Integer time_limit_minutes, PaperMode paper_mode, Integer variant_count, String rules_text, String delivery) { }
    /**
     * `sections`, `draw_rules`, `placements` chỉ có với giảng viên (exam-spec.md §3); sinh viên nhận mảng rỗng.
     * Bài giao theo phiên: sinh viên nhận `questions` rỗng (đề chỉ đọc qua phiên).
     */
    public record AssignmentDetails(AssignmentSummary assignment, List<AssignmentQuestionView> questions,
            List<SectionView> sections, List<DrawRuleView> draw_rules, List<PlacementView> placements) {
        public AssignmentDetails(AssignmentSummary assignment, List<AssignmentQuestionView> questions) {
            this(assignment, questions, List.of(), List.of(), List.of());
        }
    }
    public record SectionView(Long id, int position, String title) { }
    /** `pool_size` = số câu khớp quy tắc hiện có trong ngân hàng (sau khi trừ câu cố định và kho các quy tắc trước). */
    public record DrawRuleView(Long id, Integer section_index, Integer variant_no, Long bank_id, Long category_id,
            QuestionDifficulty difficulty, QuestionType type, int count, BigDecimal points, int pool_size) { }
    /** Vị trí của câu cố định trong cấu trúc đề. */
    public record PlacementView(Long question_id, Integer section_index, Integer variant_no) { }
    /** Điểm/câu trả lời câu khách quan là `null` với sinh viên khi chưa được xem lại. */
    public record SubmissionView(Long id, Long assignment_id, Long student_id, String student_full_name,
            String student_code, Long question_id, int attempt_no, List<Long> selected_option_ids,
            AnswerResponse response, BigDecimal score, BigDecimal max_score, boolean is_late, LocalDateTime submitted_at,
            SubmissionStatus status, SubmissionType type, String language, GradingVerdict verdict,
            boolean review_available) { }
    public record AssignmentPage(List<AssignmentSummary> items, long total, int page, int limit) { }
}
