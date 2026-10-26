package vn.lmsp.worker;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DockerSandbox {
    public static final int OUTPUT_LIMIT = 64 * 1024;
    private static final int MAX_SOURCE_BYTES = 128 * 1024;
    private static final int MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
    private final DockerProcessRunner commands = new DockerProcessRunner();
    private final String image;

    public DockerSandbox(@Value("${lms.grading.runner-image:lmsp-grader:local}") String image) {
        this.image = image;
    }

    public Container create(int memoryMb) {
        String name = "lms-grade-" + UUID.randomUUID();
        List<String> command = new ArrayList<>(List.of("docker", "create", "--name", name,
                "--network", "none", "--cpus", "1", "--memory", memoryMb + "m",
                "--memory-swap", memoryMb + "m", "--pids-limit", "64", "--read-only",
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "10001:10001",
                "--ulimit", "core=0", "--ulimit", "nofile=64:64", "--tmpfs",
                "/work:rw,exec,nosuid,nodev,size=128m,uid=10001,gid=10001", "--tmpfs",
                "/tmp:rw,noexec,nosuid,nodev,size=32m,uid=10001,gid=10001", image, "sleep", "infinity"));
        String id = runChecked(command, new byte[0], 15_000).trim();
        runChecked(List.of("docker", "start", id), new byte[0], 15_000);
        return new Container(id);
    }

    private String runChecked(List<String> command, byte[] input, long timeoutMs) {
        try {
            var result = commands.run(command, input, Duration.ofMillis(timeoutMs), OUTPUT_LIMIT);
            if (result.timedOut() || result.exitCode() != 0)
                throw new SandboxException("Docker command failed: " + text(result.stderr()));
            return text(result.stdout());
        } catch (IOException | InterruptedException error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new SandboxException("Docker runtime unavailable", error);
        }
    }

    private String text(byte[] bytes) { return new String(bytes, java.nio.charset.StandardCharsets.UTF_8); }

    public final class Container implements AutoCloseable {
        private final String id;
        private boolean closed;
        private Container(String id) { this.id = id; }

        public void writeFile(Path local, String filename) {
            if (!filename.matches("[A-Za-z0-9_.-]{1,128}") || filename.equals(".") || filename.equals(".."))
                throw new IllegalArgumentException("Invalid sandbox filename");
            try {
                byte[] source = Files.readAllBytes(local);
                if (source.length > MAX_SOURCE_BYTES) throw new SandboxException("Source file exceeds the size limit");
                var result = execute(List.of("/bin/sh", "-c", "cat > /work/" + filename), source, 5000);
                if (result.timedOut() || result.exitCode() != 0)
                    throw new SandboxException("Could not transfer source file to sandbox: " + text(result.stderr()));
            } catch (IOException error) {
                throw new SandboxException("Could not read source file", error);
            }
        }

        public byte[] archiveWorkDirectory() {
            try {
                var result = commands.run(List.of("docker", "exec", id, "tar", "-C", "/work", "-cf", "-", "."),
                        new byte[0], Duration.ofSeconds(20), MAX_ARTIFACT_BYTES);
                if (result.timedOut() || result.exitCode() != 0)
                    throw new SandboxException("Could not collect compiled files: " + text(result.stderr()));
                return result.stdout();
            } catch (DockerProcessRunner.OutputLimitException error) {
                throw new ArtifactLimitException();
            } catch (IOException | InterruptedException error) {
                if (error instanceof InterruptedException) Thread.currentThread().interrupt();
                throw new SandboxException("Could not collect compiled files", error);
            }
        }

        public void extractArchive(byte[] archive) {
            var result = execute(List.of("tar", "-C", "/work", "-xf", "-"), archive, 20_000);
            if (result.timedOut() || result.exitCode() != 0)
                throw new SandboxException("Could not prepare compiled files in sandbox: " + text(result.stderr()));
        }

        public DockerProcessRunner.Result execute(List<String> args, byte[] input, int timeoutMs) {
            var command = new ArrayList<>(List.of("docker", "exec", "-i", id, "/usr/bin/timeout",
                    "--signal=KILL", "--kill-after=0.1s", String.format(Locale.ROOT, "%.3fs", timeoutMs / 1000.0)));
            command.addAll(args);
            try {
                return commands.run(command, input, Duration.ofMillis(timeoutMs + 2500L), OUTPUT_LIMIT);
            } catch (IOException | InterruptedException error) {
                if (error instanceof InterruptedException) Thread.currentThread().interrupt();
                throw new SandboxException("Sandbox execution failed", error);
            }
        }

        public boolean memoryExceeded() {
            try {
                return "true".equals(runChecked(List.of("docker", "inspect", "--format={{.State.OOMKilled}}", id),
                        new byte[0], 5000).trim());
            } catch (SandboxException ignored) { return false; }
        }

        @Override public void close() {
            if (closed) return;
            closed = true;
            try { runChecked(List.of("docker", "rm", "-f", id), new byte[0], 10_000); }
            catch (SandboxException ignored) { }
        }
    }

    public static final class ArtifactLimitException extends RuntimeException { }
}
