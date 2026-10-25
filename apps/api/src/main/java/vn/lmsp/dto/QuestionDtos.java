package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;

public final class QuestionDtos {
    private QuestionDtos() { }
    public record QuestionBankInput(@NotBlank @Size(max=100) String name, String description, Long course_id) { }
    public record QuestionBankView(Long id, Long course_id, String course_name, Long owner_id,
                                   String name, String description, LocalDateTime created_at) { }
    public record CategoryInput(@NotBlank @Size(max=100) String name) { }
    public record CategoryView(Long id, Long bank_id, String name) { }
    public record QuestionInput(@NotNull Long bank_id, Long category_id, @NotNull QuestionType type, @NotBlank String content, @Size(max=100) String topic,
                                QuestionDifficulty difficulty, @Valid List<OptionInput> options,
                                @Valid ProgrammingInput programming) { }
    public record QuestionPatch(Long category_id, QuestionType type, @Size(min=1) String content, @Size(max=100) String topic,
                                QuestionDifficulty difficulty, @Valid List<OptionInput> options,
                                @Valid ProgrammingInput programming) { }
    public record OptionInput(@NotBlank @Size(max=60000) String content, Boolean is_correct) { }
    public record ProgrammingInput(String starter_code, String solution_code, List<@Pattern(regexp="python|c|cpp|java") String> allowed_languages,
                                   @Min(100) @Max(30000) Integer time_limit_ms, @Min(32) @Max(2048) Integer memory_limit_mb) { }
    public record TestCaseInput(@NotNull String input, @NotNull String expected_output, Boolean is_public,
                                @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal weight) { }
    public record OptionView(Long id, String content, boolean is_correct, int position) { }
    public record ProgrammingView(String starter_code, String solution_code, List<String> allowed_languages,
                                  int time_limit_ms, int memory_limit_mb) { }
    public record TestCaseView(String input, String expected_output, boolean is_public, BigDecimal weight, int position) { }
    public record QuestionSummary(Long id, Long owner_id, Long bank_id, Long course_id, Long category_id,
                                  String bank_name, String category_name, QuestionType type, String content, String topic,
                                  QuestionDifficulty difficulty, int version_no, LocalDateTime updated_at) { }
    public record QuestionView(Long id, Long owner_id, Long bank_id, Long course_id, Long category_id,
                               String bank_name, String category_name, QuestionType type, String content, String topic,
                               QuestionDifficulty difficulty, int version_no, List<OptionView> options,
                               ProgrammingView programming, List<TestCaseView> test_cases,
                               LocalDateTime created_at, LocalDateTime updated_at) { }
    public record QuestionCsvRow(int row, String content, String difficulty, String topic,
                                 List<String> options, String correct_option) { }
    public record QuestionCsvRequest(@NotNull @Size(min=1, max=500) List<QuestionCsvRow> rows) { }
    public record QuestionCsvPreviewRow(int row, String content, boolean valid, String code, String reason) { }
    public record QuestionCsvPreview(int valid_rows, List<QuestionCsvPreviewRow> rows) { }
    public record QuestionImportError(int row, String code, String reason) { }
    public record QuestionImportResult(int created, List<QuestionImportError> errors) { }
    public record QuestionPage(List<QuestionSummary> items, long total, int page, int limit) { }
    public record QuestionSnapshot(QuestionType type, String content, String topic, QuestionDifficulty difficulty,
                                   List<OptionView> options, ProgrammingView programming, List<TestCaseView> test_cases) { }
}
