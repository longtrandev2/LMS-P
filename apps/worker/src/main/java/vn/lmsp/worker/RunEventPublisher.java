package vn.lmsp.worker;

import java.util.List;
import org.springframework.stereotype.Component;

/** Event `run.status` / `run.completed` trên `lms` / `run.events` — docs/message-contracts.md §5. */
@Component
public class RunEventPublisher {
    private static final String ROUTING_KEY = "run.events";
    private final ConfirmedPublisher publisher;

    public RunEventPublisher(ConfirmedPublisher publisher) { this.publisher = publisher; }

    public void running(String runId) {
        publisher.publish(ROUTING_KEY, "run-status-" + runId,
                new Event("run.status", new StatusPayload(runId, "running")));
    }

    public void completed(String runId, ExecutionResult result) {
        publisher.publish(ROUTING_KEY, (result.failed() ? "run-failed-" : "run-completed-") + runId,
                new Event("run.completed", payload(runId, result)));
    }

    public void failed(String runId, String error, int durationMs) {
        completed(runId, ExecutionResult.failure(error, durationMs));
    }

    static CompletedPayload payload(String runId, ExecutionResult result) {
        var tests = result.tests().stream()
                .map(test -> new TestPayload(test.position(), test.verdict().name(), test.timeMs(), test.output()))
                .toList();
        return new CompletedPayload(runId, result.failed() ? "failed" : "completed", result.verdict().name(),
                result.compileOutput(), result.errorMessage(), result.durationMs(), tests);
    }

    record Event(String event, Object payload) { }
    record StatusPayload(String run_id, String status) { }
    record CompletedPayload(String run_id, String status, String verdict, String compile_output,
            String error_message, Integer duration_ms, List<TestPayload> tests) { }
    record TestPayload(int position, String verdict, int time_ms, String output) { }
}
