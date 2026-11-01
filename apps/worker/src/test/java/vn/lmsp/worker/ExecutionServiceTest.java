package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class ExecutionServiceTest {
    private static ExecutionRequest request() {
        return new ExecutionRequest("python", "print(input())", 1000, 64, OutputChecker.of(null, null), 4096, true,
                List.of(new ExecutionRequest.TestInput(1, "1", "1")));
    }

    private static DockerProcessRunner.Result echo(List<String> command, String stdin) {
        return FakeSandbox.run(stdin, 0, 3, false, false);
    }

    @Test void retriesDockerFailuresThenSucceeds() {
        var sandbox = new FakeSandbox(ExecutionServiceTest::echo);
        sandbox.failOpens = 2;
        var result = new ExecutionService(new CodeExecutor(sandbox)).run(request(), "test");
        assertFalse(result.failed());
        assertEquals(GradingVerdict.AC, result.verdict());
    }

    @Test void reportsSystemErrorAfterBoundedRetries() {
        var sandbox = new FakeSandbox(ExecutionServiceTest::echo);
        sandbox.failOpens = ExecutionService.MAX_ATTEMPTS;
        var result = new ExecutionService(new CodeExecutor(sandbox)).run(request(), "test");
        assertTrue(result.failed());
        assertEquals(GradingVerdict.SYSTEM_ERROR, result.verdict());
        assertTrue(result.tests().isEmpty());
        assertNotNull(result.errorMessage());
    }

    @Test void jobTimeoutIsSystemErrorNotTle() {
        var executor = new CodeExecutor(new FakeSandbox(ExecutionServiceTest::echo)) {
            @Override public ExecutionResult execute(ExecutionRequest request, JobDeadline deadline) {
                throw new JobDeadline.JobTimeoutException();
            }
        };
        var result = new ExecutionService(executor).run(request(), "test");
        assertTrue(result.failed());
        assertEquals(GradingVerdict.SYSTEM_ERROR, result.verdict());
    }
}
