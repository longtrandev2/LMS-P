package vn.lmsp.dto;

import java.util.List;
import vn.lmsp.dto.RunDtos.RunEventTest;

/** Kết quả cuối của run job, lưu ở `run_jobs.result` (message-contracts.md §5). */
public record RunJobResult(String compile_output, String error_message, Integer duration_ms, List<RunEventTest> tests) { }
