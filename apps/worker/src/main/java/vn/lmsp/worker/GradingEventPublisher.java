package vn.lmsp.worker;

import java.util.List;
import org.springframework.stereotype.Component;

/** Event `submission.status` / `submission.graded` — docs/message-contracts.md §3. */
@Component
public class GradingEventPublisher {
    private static final String ROUTING_KEY = "grading.events";
    private final ConfirmedPublisher publisher;

    public GradingEventPublisher(ConfirmedPublisher publisher) { this.publisher = publisher; }

    public void progress(JobMessage job) {
        publisher.publish(ROUTING_KEY, "status-" + job.job_id(), new Event("submission.status",
                new StatusPayload(job.job_id(), job.submission_id(), "grading")));
    }

    public void completed(JobMessage job, ExecutionResult result) {
        publisher.publish(ROUTING_KEY, "graded-" + job.job_id(), new Event("submission.graded", payload(job, result)));
    }

    public void failed(JobMessage job, String error, int durationMs) {
        publisher.publish(ROUTING_KEY, "failed-" + job.job_id(), new Event("submission.graded",
                payload(job, ExecutionResult.failure(error, durationMs))));
    }

    static GradedPayload payload(JobMessage job, ExecutionResult result) {
        var tests = result.tests().stream()
                .map(test -> new TestPayload(test.position(), test.verdict().name(), test.timeMs(), test.memoryKb(),
                        OutputText.truncate(test.output(), OutputText.EVENT_OUTPUT_BYTES)))
                .toList();
        return new GradedPayload(job.job_id(), job.submission_id(), result.failed() ? "failed" : "completed",
                result.verdict().name(), result.compileError(), result.compileOutput(), result.errorMessage(),
                result.durationMs(), result.testsTotal(), result.testsPassed(), result.failedTest(), tests);
    }

    record Event(String event, Object payload) { }
    record StatusPayload(String job_id, Long submission_id, String status) { }
    record GradedPayload(String job_id, Long submission_id, String status, String verdict, boolean compile_error,
            String compile_output, String error_message, Integer duration_ms, Integer tests_total,
            Integer tests_passed, Integer failed_test, List<TestPayload> tests) { }
    record TestPayload(int position, String verdict, int time_ms, Integer memory_kb, String output) { }
}
