package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.ReviewDtos.CorrectAnswer;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.enums.GradingVerdict;

public final class GradingDtos {
    private GradingDtos() { }

    public record Accepted(Long submission_id, SubmissionStatus status) { }
    public record RegradeInput(@NotBlank @Size(max = 500) String reason) { }
    public record JobMessage(int schema_version, String job_id, Long submission_id, Long question_id,
            Long question_version_id, Long student_id, String language, int grading_attempt,
            int priority, String enqueued_at) { }
    public record WorkerEvent(@NotBlank String event, @NotNull @Valid WorkerPayload payload) { }
    /** Event v4 — docs/message-contracts.md §3. `tests*`/`failed_test` vắng ở event v3. */
    public record WorkerPayload(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String job_id,
            @NotNull @Positive Long submission_id, @NotNull SubmissionStatus status, GradingVerdict verdict,
            boolean compile_error, String compile_output, String error_message,
            @Min(0) @Max(3600000) Integer duration_ms, @Min(0) @Max(100) Integer tests_total,
            @Min(0) @Max(100) Integer tests_passed, @Min(1) @Max(100) Integer failed_test,
            @Size(max = 100) List<@NotNull @Valid WorkerTest> tests) {
        public WorkerPayload(String job_id, Long submission_id, SubmissionStatus status, GradingVerdict verdict,
                boolean compile_error, String compile_output, String error_message, Integer duration_ms) {
            this(job_id, submission_id, status, verdict, compile_error, compile_output, error_message, duration_ms,
                    null, null, null, null);
        }
    }
    public record WorkerTest(@Min(1) int position, @NotNull GradingVerdict verdict, @Min(0) Integer time_ms,
            @Min(0) Integer memory_kb, @Size(max = 65536) String output) { }
    /** Sinh viên chỉ nhận `input/expected_output/output` của test công khai. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TestView(int position, boolean is_public, GradingVerdict verdict, Integer time_ms, Integer memory_kb,
            String input, String expected_output, String output) { }
    public record ResultView(int grading_attempt, String status, GradingVerdict verdict, boolean compile_error,
            String compile_output, String error_message, LocalDateTime graded_at, int duration_ms,
            Integer tests_total, Integer tests_passed, Integer failed_test, List<TestView> tests) { }
    /** `correct_answer`/`explanation` chỉ có ở câu khách quan khi được xem lại kèm đáp án (giảng viên: luôn có). */
    public record SubmissionDetails(Long id, Long assignment_id, Long question_id, Long question_version_id,
            Long student_id, int attempt_no, SubmissionType type, SubmissionStatus status, GradingVerdict verdict,
            BigDecimal score, BigDecimal max_score, String language, String source_code, AnswerResponse response,
            boolean is_late, LocalDateTime submitted_at, ResultView result, List<ResultView> results,
            boolean review_available, CorrectAnswer correct_answer, String explanation) { }
}
