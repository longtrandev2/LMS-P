package vn.lmsp.worker;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Chấm một job trong một container: biên dịch một lần, chạy lần lượt từng test qua `lmsp-run`
 * (dọn `/tmp` và tiến trình còn sót giữa các test) — docs/assessment-spec.md §5, §7.
 */
@Service
public class CodeExecutor {
    static final String RUNNER = "/usr/local/bin/lmsp-run";
    static final int COMPILE_TIMEOUT_MS = 30_000;
    static final int COMPILE_MEMORY_MB = 1024;
    static final int COMPILE_LOG_BYTES = 64 * 1024;
    /** Thời gian chờ thêm cho `docker exec` ngoài giới hạn test (khởi động exec, dọn dẹp, báo cáo). */
    static final int EXEC_MARGIN_MS = 5_000;

    private final SandboxRunner sandbox;

    public CodeExecutor(SandboxRunner sandbox) { this.sandbox = sandbox; }

    /** Ném {@link SandboxException} (lỗi Docker, có thể thử lại) hoặc {@link JobDeadline.JobTimeoutException}. */
    public ExecutionResult execute(ExecutionRequest request, JobDeadline deadline) {
        var language = request.profile();
        int runMemory = language.containerMemoryMb(request.memoryLimitMb());
        int openMemory = language.compiled() ? Math.max(COMPILE_MEMORY_MB, runMemory) : runMemory;
        deadline.ensureTime();
        try (var session = sandbox.open(openMemory)) {
            session.writeFile(language.sourceFile(), request.sourceCode().getBytes(StandardCharsets.UTF_8));
            if (language.compiled()) {
                deadline.ensureTime();
                String error = compile(session, language);
                if (error != null)
                    return ExecutionResult.compileError(error, request.tests().size(), deadline.elapsedMs());
                if (openMemory != runMemory) session.resizeMemory(runMemory);
            }
            var outcomes = new ArrayList<ExecutionResult.TestOutcome>();
            for (var test : request.tests()) {
                deadline.ensureTime();
                var outcome = runTest(session, request, test);
                outcomes.add(outcome);
                if (request.stopOnFailure() && !outcome.verdict().passed()) break;
            }
            return ExecutionResult.of(outcomes, request.tests().size(), deadline.elapsedMs());
        }
    }

    /** Trả log lỗi biên dịch (CE) hoặc null nếu biên dịch thành công. */
    private String compile(SandboxRunner.Session session, LanguageProfile language) {
        var command = new ArrayList<>(List.of("/usr/bin/timeout", "--signal=KILL", COMPILE_TIMEOUT_MS / 1000 + "s"));
        command.addAll(language.compileCommand());
        try {
            var result = session.exec(command, new byte[0], COMPILE_TIMEOUT_MS + EXEC_MARGIN_MS);
            if (result.timedOut()) throw new SandboxException("Compiler did not return in time");
            if (result.exitCode() == 124 || result.exitCode() == 137)
                return "Biên dịch quá thời gian hoặc vượt bộ nhớ cho phép.";
            if (result.exitCode() == 0) return null;
            String log = OutputText.decode(result.stderr());
            if (log.isBlank()) log = OutputText.decode(result.stdout());
            return OutputText.truncate(log.isBlank() ? "Biên dịch thất bại." : log, COMPILE_LOG_BYTES);
        } catch (DockerProcessRunner.OutputLimitException error) {
            return "Log biên dịch vượt giới hạn 64 KiB.";
        }
    }

    private ExecutionResult.TestOutcome runTest(SandboxRunner.Session session, ExecutionRequest request,
            ExecutionRequest.TestInput test) {
        var language = request.profile();
        int limit = language.realTimeLimitMs(request.timeLimitMs());
        var command = new ArrayList<>(List.of(RUNNER, Integer.toString(limit)));
        command.addAll(language.runCommand(request.memoryLimitMb()));
        long started = System.nanoTime();
        try {
            var result = session.exec(command, test.input().getBytes(StandardCharsets.UTF_8), limit + EXEC_MARGIN_MS);
            if (result.timedOut()) throw new SandboxException("Sandbox did not finish the test in time");
            var report = RunReport.parse(result.stderr());
            String output = OutputText.decode(result.stdout());
            var verdict = VerdictClassifier.classify(report, limit);
            if (verdict == null) verdict = VerdictClassifier.check(request.checker(), output, test.expectedOutput());
            return new ExecutionResult.TestOutcome(test.position(), verdict, report.elapsedMs(), null,
                    OutputText.truncate(output, request.outputLimitBytes()));
        } catch (DockerProcessRunner.OutputLimitException error) {
            int elapsed = (int) Math.min(limit, (System.nanoTime() - started) / 1_000_000);
            String partial = OutputText.decode(error.partial());
            return new ExecutionResult.TestOutcome(test.position(), GradingVerdict.OLE, elapsed, null,
                    OutputText.truncate(partial, request.outputLimitBytes()));
        }
    }
}
