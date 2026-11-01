package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class EventPayloadTest {
    private final ObjectMapper json = new ObjectMapper();
    private final JobMessage job = new JobMessage(3, "12345678-1234-1234-1234-123456789abc", 1024L, 55L, 81L,
            "python", 1, 5);

    private JsonNode tree(Object value) { return json.valueToTree(value); }

    @Test void gradedEventCarriesPerTestResults() {
        var tests = List.of(new ExecutionResult.TestOutcome(1, GradingVerdict.AC, 12, null, "7"),
                new ExecutionResult.TestOutcome(3, GradingVerdict.WA, 11, null, "ế".repeat(2000)));
        var payload = tree(GradingEventPublisher.payload(job, ExecutionResult.of(tests, 10, 1200)));
        assertEquals("completed", payload.get("status").asText());
        assertEquals("WA", payload.get("verdict").asText());
        assertFalse(payload.get("compile_error").asBoolean());
        assertEquals(10, payload.get("tests_total").asInt());
        assertEquals(1, payload.get("tests_passed").asInt());
        assertEquals(3, payload.get("failed_test").asInt());
        var second = payload.get("tests").get(1);
        assertEquals(3, second.get("position").asInt());
        assertEquals(11, second.get("time_ms").asInt());
        assertTrue(second.has("memory_kb") && second.get("memory_kb").isNull());
        assertTrue(second.get("output").asText().getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 4096);
    }

    @Test void compileErrorAndFailureHaveEmptyTests() {
        var ce = tree(GradingEventPublisher.payload(job, ExecutionResult.compileError("boom", 4, 50)));
        assertEquals("CE", ce.get("verdict").asText());
        assertTrue(ce.get("compile_error").asBoolean());
        assertEquals(0, ce.get("tests").size());
        assertTrue(ce.get("failed_test").isNull());

        var failed = tree(GradingEventPublisher.payload(job, ExecutionResult.failure("docker down", 10)));
        assertEquals("failed", failed.get("status").asText());
        assertEquals("SYSTEM_ERROR", failed.get("verdict").asText());
        assertEquals("docker down", failed.get("error_message").asText());
        assertEquals(0, failed.get("tests").size());
    }

    @Test void runCompletedEventMatchesContract() {
        var tests = List.of(new ExecutionResult.TestOutcome(1, GradingVerdict.AC, 5, null, "3"),
                new ExecutionResult.TestOutcome(2, GradingVerdict.OK, 4, null, "10"));
        var payload = tree(RunEventPublisher.payload("run-1", ExecutionResult.of(tests, 2, 900)));
        assertEquals("run-1", payload.get("run_id").asText());
        assertEquals("completed", payload.get("status").asText());
        assertEquals("AC", payload.get("verdict").asText());
        assertEquals(900, payload.get("duration_ms").asInt());
        assertEquals("OK", payload.get("tests").get(1).get("verdict").asText());
        assertEquals("10", payload.get("tests").get(1).get("output").asText());
        assertFalse(payload.get("tests").get(0).has("memory_kb"));

        var failed = tree(RunEventPublisher.payload("run-1", ExecutionResult.failure("x", 0)));
        assertEquals("failed", failed.get("status").asText());
        assertEquals("SYSTEM_ERROR", failed.get("verdict").asText());
    }
}
