package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class JobDeadlineTest {
    static ExecutionRequest request(String language, int timeMs, int tests) {
        var inputs = new ArrayList<ExecutionRequest.TestInput>();
        for (int i = 1; i <= tests; i++) inputs.add(new ExecutionRequest.TestInput(i, "", "x"));
        return new ExecutionRequest(language, "code", timeMs, 256, OutputChecker.of(null, null), 4096, true, inputs);
    }

    @Test void smallJobsGetSixtySeconds() {
        assertEquals(60_000, JobDeadline.budgetMs(request("cpp", 1000, 5)));
    }

    @Test void budgetUsesRealLimitsWithLanguageFactor() {
        // C++: 50 × 1000 × 1,5 + 30000
        assertEquals(105_000, JobDeadline.budgetMs(request("cpp", 1000, 50)));
        // Java ×2: 50 × 2000 × 1,5 + 30000
        assertEquals(180_000, JobDeadline.budgetMs(request("java", 1000, 50)));
        // Python ×2: 100 × 10000 × 2 × 1,5 + 30000
        assertEquals(3_030_000, JobDeadline.budgetMs(request("python", 10_000, 100)));
    }

    @Test void ensureTimeThrowsAfterBudget() {
        var clock = new AtomicLong(1_000);
        var deadline = new JobDeadline(60_000, clock::get);
        clock.set(60_999);
        assertDoesNotThrow(deadline::ensureTime);
        assertEquals(59_999, deadline.elapsedMs());
        clock.set(61_000);
        assertThrows(JobDeadline.JobTimeoutException.class, deadline::ensureTime);
    }

    @Test void requestValidatesLimits() {
        assertThrows(IllegalArgumentException.class, () -> request("go", 1000, 1));
        assertThrows(IllegalArgumentException.class, () -> request("c", 99, 1));
        assertThrows(IllegalArgumentException.class, () -> request("c", 30_001, 1));
        assertThrows(IllegalArgumentException.class, () -> request("c", 1000, 0));
        assertThrows(IllegalArgumentException.class, () -> request("c", 1000, 201));
        assertDoesNotThrow(() -> request("c", 30_000, 200));
        String big = "x".repeat(128 * 1024);
        var tooMuch = new ArrayList<ExecutionRequest.TestInput>();
        for (int i = 1; i <= 9; i++) tooMuch.add(new ExecutionRequest.TestInput(i, big, big)); // 2,25 MiB
        assertThrows(IllegalArgumentException.class, () -> new ExecutionRequest("c", "x", 1000, 256,
                OutputChecker.of(null, null), 4096, true, tooMuch));
        var oneOversized = List.of(new ExecutionRequest.TestInput(1, big + "x", "1"));
        assertThrows(IllegalArgumentException.class, () -> new ExecutionRequest("c", "x", 1000, 256,
                OutputChecker.of(null, null), 4096, true, oneOversized));
    }
}
