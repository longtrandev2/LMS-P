package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class CodeExecutorTest {
    private static final OutputChecker TOKEN = OutputChecker.of("token", null);

    private static ExecutionRequest request(String language, boolean stop, int outputLimit,
            ExecutionRequest.TestInput... tests) {
        return new ExecutionRequest(language, "src", 1000, 64, TOKEN, outputLimit, stop, List.of(tests));
    }

    private static ExecutionRequest.TestInput test(int position, String input, String expected) {
        return new ExecutionRequest.TestInput(position, input, expected);
    }

    private static JobDeadline deadline() { return new JobDeadline(60_000, () -> 0L); }

    /** Chương trình "echo": in lại input; input "tle"/"mle"/"crash"/"big" giả lập lỗi tương ứng. */
    private static DockerProcessRunner.Result echo(List<String> command, String stdin) {
        if (!FakeSandbox.isTest(command)) return FakeSandbox.ok("");
        int limit = Integer.parseInt(command.get(1));
        return switch (stdin) {
            case "tle" -> FakeSandbox.run("", 137, limit + 2, false, false);
            case "mle" -> FakeSandbox.run("", 137, 20, true, false);
            case "crash" -> FakeSandbox.run("", 1, 5, false, false);
            case "big" -> throw new DockerProcessRunner.OutputLimitException("y".repeat(64 * 1024).getBytes());
            default -> FakeSandbox.run(stdin, 0, 7, false, false);
        };
    }

    @Test void compiledLanguageCompilesOnceInOneContainerThenShrinksMemory() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        var result = new CodeExecutor(sandbox).execute(
                request("java", true, 4096, test(1, "1", "1"), test(2, "2", "2")), deadline());
        assertEquals(GradingVerdict.AC, result.verdict());
        assertEquals(List.of(CodeExecutor.COMPILE_MEMORY_MB), sandbox.openedMemory);
        assertEquals(List.of(64 + LanguageProfile.JVM_OVERHEAD_MB), sandbox.resizedMemory);
        assertEquals(List.of("Main.java"), sandbox.files);
        assertEquals(3, sandbox.commands.size());
        assertTrue(sandbox.commands.get(0).contains("javac"));
        var run = sandbox.commands.get(1);
        assertEquals("2000", run.get(1), "Java dùng hệ số thời gian ×2");
        assertTrue(run.containsAll(List.of("-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Xss64m", "-Xmx64m")));
        assertEquals(1, sandbox.closed);
        assertEquals(2, result.testsTotal());
        assertEquals(2, result.testsPassed());
        assertNull(result.failedTest());
    }

    @Test void pythonSkipsCompileAndUsesFactorTwo() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        new CodeExecutor(sandbox).execute(request("python", true, 4096, test(1, "1", "1")), deadline());
        assertEquals(List.of(64), sandbox.openedMemory);
        assertTrue(sandbox.resizedMemory.isEmpty());
        assertEquals(1, sandbox.commands.size());
        assertEquals("2000", sandbox.commands.get(0).get(1));
    }

    @Test void stopsAtFirstFailedTest() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        var result = new CodeExecutor(sandbox).execute(request("cpp", true, 4096,
                test(1, "1", "1"), test(2, "2", "3"), test(3, "3", "3")), deadline());
        assertEquals(GradingVerdict.WA, result.verdict());
        assertEquals(2, result.tests().size());
        assertEquals(2, result.failedTest());
        assertEquals(1, result.testsPassed());
        assertEquals(3, result.testsTotal());
        assertEquals("1000", sandbox.commands.get(1).get(1), "C++ dùng hệ số ×1");
    }

    @Test void runJobContinuesAndReportsOkForMissingExpected() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        var result = new CodeExecutor(sandbox).execute(request("c", false, 4096,
                test(1, "tle", "x"), test(2, "mle", "x"), test(3, "crash", "x"), test(4, "big", "x"),
                test(5, "5", null), test(6, "6", "6")), deadline());
        var verdicts = result.tests().stream().map(ExecutionResult.TestOutcome::verdict).toList();
        assertEquals(List.of(GradingVerdict.TLE, GradingVerdict.MLE, GradingVerdict.RE, GradingVerdict.OLE,
                GradingVerdict.OK, GradingVerdict.AC), verdicts);
        assertEquals(GradingVerdict.TLE, result.verdict());
        assertEquals(1, result.failedTest());
        assertEquals("5", result.tests().get(4).output());
        assertEquals(4096, result.tests().get(3).output().length(), "output OLE cắt theo output_limit_bytes");
    }

    @Test void allOkIsOverallAc() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        var result = new CodeExecutor(sandbox).execute(request("c", false, 65536, test(1, "a", null)), deadline());
        assertEquals(GradingVerdict.AC, result.verdict());
        assertEquals(1, result.testsPassed());
    }

    @Test void outputIsTruncatedToLimit() {
        var sandbox = new FakeSandbox(CodeExecutorTest::echo);
        String big = "z".repeat(10_000);
        var result = new CodeExecutor(sandbox).execute(request("c", false, 4096, test(1, big, big)), deadline());
        assertEquals(GradingVerdict.AC, result.verdict());
        assertEquals(4096, result.tests().get(0).output().length());
    }

    @Test void compileErrorReturnsLogAndNoTests() {
        var sandbox = new FakeSandbox((command, stdin) -> FakeSandbox.result(1, "", "Main.c:1: error"));
        var result = new CodeExecutor(sandbox).execute(request("c", true, 4096, test(1, "1", "1")), deadline());
        assertEquals(GradingVerdict.CE, result.verdict());
        assertTrue(result.compileError());
        assertEquals("Main.c:1: error", result.compileOutput());
        assertTrue(result.tests().isEmpty());
        assertEquals(1, sandbox.commands.size());
        assertEquals(1, sandbox.closed);
    }

    @Test void missingRunnerReportIsSandboxError() {
        var sandbox = new FakeSandbox((command, stdin) -> FakeSandbox.ok("1"));
        assertThrows(SandboxException.class, () -> new CodeExecutor(sandbox)
                .execute(request("c", true, 4096, test(1, "1", "1")), deadline()));
        assertEquals(1, sandbox.closed);
    }

    @Test void exceedingJobBudgetThrowsTimeout() {
        var clock = new AtomicLong();
        var sandbox = new FakeSandbox((command, stdin) -> {
            clock.addAndGet(40_000);
            return echo(command, stdin);
        });
        var budget = new JobDeadline(60_000, clock::get);
        assertThrows(JobDeadline.JobTimeoutException.class, () -> new CodeExecutor(sandbox)
                .execute(request("c", true, 4096, test(1, "1", "1"), test(2, "2", "2")), budget));
        assertEquals(1, sandbox.closed);
    }
}
