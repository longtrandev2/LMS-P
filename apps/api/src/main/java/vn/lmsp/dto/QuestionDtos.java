package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.enums.ScoringMode;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.BankPermission;

public final class QuestionDtos {
    private QuestionDtos() { }
    public record QuestionBankInput(@NotBlank @Size(max=100) String name, String description,
                                    @NotNull Long course_id, @Pattern(regexp="private|shared") String visibility) { }
    public record QuestionBankView(Long id, Long course_id, String course_name, Long owner_id,
                                   String name, String description, String visibility, boolean can_edit, boolean can_manage,
                                   LocalDateTime created_at) { }
    public record BankPermissionInput(@NotNull BankPermission permission) { }
    public record QuestionBankVisibilityInput(@Pattern(regexp="private|shared") String visibility) { }
    public record BankPermissionView(Long lecturer_id, BankPermission permission) { }
    public record BankLecturerView(Long id, String full_name, String email) { }
    public record CategoryInput(@NotBlank @Size(max=100) String name) { }
    public record CategoryView(Long id, Long bank_id, String name) { }
    public record QuestionInput(@NotNull Long bank_id, Long category_id, @NotNull QuestionType type,
                                @NotBlank @Size(max=60000) String content, @Size(max=100) String topic,
                                QuestionDifficulty difficulty, @Size(max=10000) String explanation, ScoringMode scoring_mode,
                                @Valid List<OptionInput> options, @Valid AnswerSpec answer_spec,
                                @Valid ProgrammingInput programming, @Valid List<@NotNull TestCaseInput> test_cases) { }
    /** Trường null = giữ nguyên. `type` chỉ được gửi lại đúng loại hiện tại. `explanation=""` để xóa giải thích. */
    public record QuestionPatch(Long category_id, QuestionType type, @Size(min=1, max=60000) String content, @Size(max=100) String topic,
                                QuestionDifficulty difficulty, @Size(max=10000) String explanation, ScoringMode scoring_mode,
                                @Valid List<OptionInput> options, @Valid AnswerSpec answer_spec,
                                @Valid ProgrammingInput programming, @Valid List<@NotNull TestCaseInput> test_cases) { }
    public record OptionInput(@NotBlank @Size(max=60000) String content, Boolean is_correct) { }
    /** `starter_code` là trường cũ, chỉ nhận để tương thích; form mới gửi `starter_codes`. */
    public record ProgrammingInput(String starter_code, Map<@Pattern(regexp="python|c|cpp|java") String, String> starter_codes,
                                   String solution_code, @Pattern(regexp="python|c|cpp|java") String solution_language,
                                   List<@Pattern(regexp="python|c|cpp|java") String> allowed_languages,
                                   @Min(100) @Max(20000) Integer time_limit_ms, @Min(32) @Max(2048) Integer memory_limit_mb,
                                   @Pattern(regexp="token|line|float") String checker_mode,
                                   @DecimalMin("1e-12") @DecimalMax("1") Double checker_epsilon) { }
    /** `weight` không dùng (chấm nhị phân) — server bỏ qua và lưu 1. */
    public record TestCaseInput(@NotNull String input, @NotNull String expected_output, Boolean is_public, BigDecimal weight) { }
    public record OptionView(Long id, String content, boolean is_correct, int position) { }
    /** Phần lập trình của câu hỏi/snapshot — docs/assessment-spec.md §4. `starter_code` là trường cũ, đọc tương thích. */
    public record ProgrammingView(String starter_code, java.util.Map<String, String> starter_codes,
                                  String solution_code, String solution_language, List<String> allowed_languages,
                                  int time_limit_ms, int memory_limit_mb, String checker_mode, Double checker_epsilon) { }
    public record TestCaseView(String input, String expected_output, boolean is_public, BigDecimal weight, int position) { }
    public record QuestionSummary(Long id, Long owner_id, Long bank_id, Long course_id, Long category_id,
                                  String bank_name, String category_name, QuestionType type, String content, String topic,
                                  QuestionDifficulty difficulty, int version_no, LocalDateTime updated_at) { }
    public record QuestionView(Long id, Long owner_id, Long bank_id, Long course_id, Long category_id,
                               String bank_name, String category_name, QuestionType type, String content, String topic,
                               QuestionDifficulty difficulty, int version_no, String explanation, ScoringMode scoring_mode,
                               AnswerSpec answer_spec, List<OptionView> options,
                               ProgrammingView programming, List<TestCaseView> test_cases,
                               LocalDateTime created_at, LocalDateTime updated_at) { }
    /** `type` ∈ mcq/multiple_choice/true_false/short_answer (mặc định mcq) — api-spec.md §5. */
    public record QuestionCsvRow(int row, String type, String content, String difficulty, String topic,
                                 List<String> options, String correct_option, String explanation) { }
    public record QuestionCsvRequest(@NotNull @Size(min=1, max=500) List<QuestionCsvRow> rows) { }
    public record QuestionCsvPreviewRow(int row, String content, boolean valid, String code, String reason) { }
    public record QuestionCsvPreview(int valid_rows, List<QuestionCsvPreviewRow> rows) { }
    public record QuestionImportError(int row, String code, String reason) { }
    public record QuestionImportResult(int created, List<QuestionImportError> errors) { }
    public record QuestionPage(List<QuestionSummary> items, long total, int page, int limit) { }
    /** Snapshot bất biến của một phiên bản — docs/assessment-spec.md §2. Trường mới vắng ở snapshot cũ đọc ra null. */
    public record QuestionSnapshot(QuestionType type, String content, String topic, QuestionDifficulty difficulty,
                                   String explanation, vn.lmsp.enums.ScoringMode scoring_mode,
                                   List<OptionView> options, vn.lmsp.dto.QuestionContentDtos.AnswerSpec answer_spec,
                                   ProgrammingView programming, List<TestCaseView> test_cases) { }
}
