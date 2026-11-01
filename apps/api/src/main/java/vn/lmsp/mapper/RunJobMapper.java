package vn.lmsp.mapper;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.RunDtos.*;
import vn.lmsp.model.RunJob;

@Component
public class RunJobMapper {
    /** Message `run.submit` (message-contracts.md §4): không chứa code hay test, worker đọc từ DB. */
    public Map<String, Object> toMessage(RunJob job) {
        return Map.of("schema_version", 1, "run_id", job.getJobId(), "kind", job.getKind().name());
    }

    /**
     * Kèm input/expected lấy từ payload: problem_check/draft_check là dữ liệu của chính người soạn,
     * practice_run chỉ chứa test công khai hoặc input tự nhập nên an toàn để trả lại.
     */
    public RunJobView toView(RunJob job) {
        var result = job.getResult();
        Map<Integer, RunTest> inputs = job.getPayload() == null || job.getPayload().tests() == null ? Map.of()
                : job.getPayload().tests().stream().collect(Collectors.toMap(RunTest::position, Function.identity(), (a, b) -> a));
        List<RunTestView> tests = result == null || result.tests() == null ? List.of() : result.tests().stream()
                .map(test -> {
                    RunTest source = inputs.get(test.position());
                    return new RunTestView(test.position(), test.verdict(), test.time_ms(), test.output(),
                            source == null ? null : source.input(), source == null ? null : source.expected_output());
                }).toList();
        return new RunJobView(job.getJobId(), job.getKind(), job.getStatus(), job.getVerdict(),
                result == null ? null : result.compile_output(), result == null ? null : result.error_message(),
                result == null ? null : result.duration_ms(), tests, job.getCreatedAt(), job.getCompletedAt());
    }
}
