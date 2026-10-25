package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.TestResultStatus;

public final class GradingDtos {
    private GradingDtos() { }

    public record Accepted(Long submission_id, SubmissionStatus status) { }
    public record JobMessage(int schema_version, String job_id, Long submission_id, Long question_id,
            Long question_version_id, Long student_id, String language, int grading_attempt,
            int priority, String enqueued_at) { }
    public record WorkerEvent(@NotBlank String event, @NotNull @Valid WorkerPayload payload) { }
    public record WorkerPayload(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String job_id,
            @NotNull @Positive Long submission_id, @NotNull SubmissionStatus status,
            boolean compile_error, String compile_output, String error_message,
            @Min(0) @Max(3600000) Integer duration_ms,
            @Size(max=200) List<@NotNull @Valid WorkerTestResult> test_results) { }
    public record WorkerTestResult(@Min(1) int position, @NotNull TestResultStatus status,
            String output, @Min(0) int time_ms, @Min(0) Integer memory_kb) { }
    public record TestView(int position, boolean is_public, String status, String input, String expected_output,
            String output, Integer time_ms, Integer memory_kb, BigDecimal score) { }
    public record ResultView(int grading_attempt, String status, BigDecimal score, boolean compile_error,
            String compile_output, String error_message, LocalDateTime graded_at, int duration_ms, List<TestView> tests) { }
    public record SubmissionDetails(Long id, Long assignment_id, Long question_id, Long question_version_id,
            Long student_id, int attempt_no, SubmissionStatus status, BigDecimal score, String language,
            String source_code, boolean is_late, LocalDateTime submitted_at, ResultView result) { }
}
