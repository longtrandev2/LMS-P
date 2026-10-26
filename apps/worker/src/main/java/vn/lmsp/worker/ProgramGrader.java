package vn.lmsp.worker;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ProgramGrader {
    private final DockerSandbox sandbox;
    private final int maxJobSeconds;

    public ProgramGrader(DockerSandbox sandbox,
            @Value("${lms.grading.job-timeout-seconds:120}") int maxJobSeconds) {
        this.sandbox = sandbox;
        this.maxJobSeconds = Math.max(10, maxJobSeconds);
    }

    public GradeOutcome grade(GradingProblem problem) {
        long started = System.nanoTime();
        try (var workspace = new Workspace(problem)) {
            var compile = compile(problem, workspace);
            if (compile != null) return outcome(GradingVerdict.CE, true, compile, null, started);
            for (var test : problem.tests()) {
                if (elapsedMs(started) > maxJobSeconds * 1000L)
                    return outcome(GradingVerdict.TLE, false, null, "Grading time limit exceeded", started);
                GradingVerdict verdict = runTest(problem, workspace, test);
                if (verdict != GradingVerdict.AC)
                    return outcome(verdict, false, null, null, started);
            }
            return outcome(GradingVerdict.AC, false, null, null, started);
        } catch (IOException error) {
            throw new SandboxException("Cannot prepare grading workspace", error);
        }
    }

    private String compile(GradingProblem problem, Workspace workspace) {
        if ("python".equals(problem.language())) return null;
        int memory = Math.max(512, problem.memoryLimitMb());
        int timeout = Math.min(30_000, Math.max(5_000, problem.timeLimitMs() * 4));
        try (var container = sandbox.create(memory)) {
            container.writeFile(workspace.source(), workspace.source().getFileName().toString());
            var result = container.execute(compileCommand(problem.language(), workspace.source().getFileName().toString()),
                    new byte[0], timeout);
            if (result.timedOut() || result.exitCode() == 124 || result.exitCode() == 137)
                return "Biên dịch quá thời gian cho phép.";
            if (result.exitCode() != 0) return boundedLog(result.stdout(), result.stderr());
            workspace.compiledArchive(container.archiveWorkDirectory());
            return null;
        } catch (DockerSandbox.ArtifactLimitException error) {
            return "Compiled files exceed the 16 MiB limit.";
        } catch (DockerProcessRunner.OutputLimitException error) {
            return "Log biên dịch vượt giới hạn 64 KiB.";
        }
    }

    private List<String> compileCommand(String language, String filename) {
        return switch (language) {
            case "c" -> List.of("gcc", "-O2", "-std=c17", "-pipe", "-o", "/work/program", "/work/" + filename);
            case "cpp" -> List.of("g++", "-O2", "-std=c++20", "-pipe", "-o", "/work/program", "/work/" + filename);
            case "java" -> List.of("javac", "-encoding", "UTF-8", "-d", "/work", "/work/Main.java");
            default -> throw new IllegalArgumentException("Unsupported language");
        };
    }

    private GradingVerdict runTest(GradingProblem problem, Workspace workspace, GradingProblem.TestCase test) {
        try (var container = sandbox.create(problem.memoryLimitMb())) {
            if ("python".equals(problem.language()))
                container.writeFile(workspace.source(), workspace.source().getFileName().toString());
            else
                container.extractArchive(workspace.compiledArchive());
            var result = container.execute(runCommand(problem), test.input().getBytes(StandardCharsets.UTF_8),
                    problem.timeLimitMs());
            if (result.timedOut() || result.exitCode() == 124) return GradingVerdict.TLE;
            if (result.exitCode() == 137)
                return container.memoryExceeded() ? GradingVerdict.MLE : GradingVerdict.TLE;
            if (result.exitCode() != 0) return GradingVerdict.RE;
            if (!normalize(text(result.stdout())).equals(normalize(test.expectedOutput()))) return GradingVerdict.WA;
            return GradingVerdict.AC;
        } catch (DockerProcessRunner.OutputLimitException error) {
            return GradingVerdict.RE;
        }
    }

    private List<String> runCommand(GradingProblem problem) {
        return switch (problem.language()) {
            case "python" -> List.of("python3", "/work/Main.py");
            case "c", "cpp" -> List.of("/work/program");
            case "java" -> List.of("java", "-Xmx" + Math.max(32, problem.memoryLimitMb() - 64) + "m", "-cp", "/work", "Main");
            default -> throw new IllegalArgumentException("Unsupported language");
        };
    }

    private String normalize(String value) {
        return value.replace("\r\n", "\n").replace('\r', '\n').strip();
    }

    private String boundedLog(byte[] stdout, byte[] stderr) {
        String error = text(stderr);
        return (error.isBlank() ? text(stdout) : error).substring(0, Math.min(64 * 1024, (error.isBlank() ? text(stdout) : error).length()));
    }

    private String text(byte[] bytes) { return new String(bytes, StandardCharsets.UTF_8); }
    private long elapsedMs(long started) { return Duration.ofNanos(System.nanoTime() - started).toMillis(); }

    private GradeOutcome outcome(GradingVerdict verdict, boolean compile, String output, String error, long started) {
        return new GradeOutcome(verdict, compile, output, error, (int) Math.min(Integer.MAX_VALUE, elapsedMs(started)));
    }

    private static class Workspace implements AutoCloseable {
        private final Path directory;
        private final Path source;
        private byte[] compiledArchive;

        Workspace(GradingProblem problem) throws IOException {
            directory = Files.createTempDirectory("lmsp-grade-");
            String filename = switch (problem.language()) {
                case "python" -> "Main.py";
                case "c" -> "Main.c";
                case "cpp" -> "Main.cpp";
                case "java" -> "Main.java";
                default -> throw new IllegalArgumentException("Unsupported language");
            };
            source = directory.resolve(filename);
            Files.writeString(source, problem.sourceCode(), StandardCharsets.UTF_8);
        }

        Path source() { return source; }
        byte[] compiledArchive() { return compiledArchive; }
        void compiledArchive(byte[] archive) { compiledArchive = archive; }

        @Override public void close() throws IOException {
            try (var paths = Files.walk(directory)) {
                for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }
}
