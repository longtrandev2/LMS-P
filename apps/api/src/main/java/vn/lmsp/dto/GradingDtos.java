package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.GradingVerdict;

public final class GradingDtos {
    private GradingDtos() { }

    public record Accepted(Long submission_id, SubmissionStatus status) { }
    public record JobMessage(int schema_version, String job_id, Long submission_id, Long question_id,
            Long question_version_id, Long student_id, String language, int grading_attempt,
            int priority, String enqueued_at) { }
    public record WorkerEvent(@NotBlank String event, @NotNull @Valid WorkerPayload payload) { }
    public record WorkerPayload(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String job_id,
            @NotNull @Positive Long submission_id, @NotNull SubmissionStatus status, GradingVerdict verdict,
            boolean compile_error, String compile_output, String error_message,
            @Min(0) @Max(3600000) Integer duration_ms) { }
    public record ResultView(int grading_attempt, String status, GradingVerdict verdict, boolean compile_error,
            String compile_output, String error_message, LocalDateTime graded_at, int duration_ms) { }
    public record SubmissionDetails(Long id, Long assignment_id, Long question_id, Long question_version_id,
            Long student_id, int attempt_no, SubmissionStatus status, GradingVerdict verdict, BigDecimal score, String language,
            String source_code, boolean is_late, LocalDateTime submitted_at, ResultView result) { }
}
