package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.RunJobKind;

/** Hợp đồng run job (kiểm tra đề / chạy thử) — docs/assessment-spec.md §7, docs/message-contracts.md §4–5. */
public final class RunDtos {
    private RunDtos() { }

    public record RunTest(int position, String input, String expected_output) { }

    /** Lưu ở `run_jobs.payload`; worker đọc trực tiếp từ DB. */
    public record RunPayload(String language, String source_code, int time_limit_ms, int memory_limit_mb,
                             String checker_mode, Double checker_epsilon, int output_limit_bytes,
                             boolean stop_on_failure, List<RunTest> tests) { }

    public record RunAccepted(String run_id) { }

    /** Body `POST /questions/draft-check`. */
    public record DraftCheckInput(@NotNull Long bank_id, @NotNull @Pattern(regexp = "python|c|cpp|java") String language,
                                  @NotBlank @Size(max = 131072) String source_code,
                                  @NotNull @Min(100) @Max(10000) Integer time_limit_ms,
                                  @NotNull @Min(32) @Max(1024) Integer memory_limit_mb,
                                  @Pattern(regexp = "token|line|float") String checker_mode,
                                  @DecimalMin("1e-12") @DecimalMax("1") Double checker_epsilon,
                                  @NotEmpty @Size(max = 100) List<@Valid DraftTest> tests) { }

    public record DraftTest(@NotNull @Size(max = 131072) String input, @Size(max = 65536) String expected_output) { }

    /** Body `POST /assignments/{id}/questions/{qid}/run`. */
    public record PracticeRunInput(@NotNull @Pattern(regexp = "python|c|cpp|java") String language,
                                   @NotBlank @Size(max = 131072) String source_code,
                                   @Size(max = 131072) String custom_input) { }

    public record RunTestView(int position, GradingVerdict verdict, Integer time_ms, String output,
                              String input, String expected_output) { }

    /** Response `GET /run-jobs/{id}`. */
    public record RunJobView(String run_id, RunJobKind kind, String status, GradingVerdict verdict,
                             String compile_output, String error_message, Integer duration_ms,
                             List<RunTestView> tests, LocalDateTime created_at, LocalDateTime completed_at) { }

    /** Event worker → API trên `q.run.events`. */
    public record RunEvent(@NotBlank String event, @NotNull @Valid RunEventPayload payload) { }

    public record RunEventPayload(@NotBlank @Pattern(regexp = "[0-9a-fA-F-]{36}") String run_id,
                                  @NotBlank @Pattern(regexp = "running|completed|failed") String status,
                                  GradingVerdict verdict, String compile_output, String error_message,
                                  @Min(0) @Max(3600000) Integer duration_ms,
                                  @Size(max = 200) List<@Valid RunEventTest> tests) { }

    public record RunEventTest(@Min(0) int position, @NotNull GradingVerdict verdict,
                               @Min(0) Integer time_ms, @Size(max = 65536) String output) { }
}
