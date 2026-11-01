package vn.lmsp.worker;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Một container Docker cho mỗi job: không mạng, rootfs read-only, non-root, giới hạn CPU/RAM/PID. */
@Component
public class DockerSandbox implements SandboxRunner {
    private static final int STDERR_LIMIT = 64 * 1024;
    private static final int MAX_FILE_BYTES = 128 * 1024;
    private final DockerProcessRunner commands = new DockerProcessRunner();
    private final String image;

    public DockerSandbox(@Value("${lms.grading.runner-image:lmsp-grader:local}") String image) {
        this.image = image;
    }

    @Override
    public Container open(int memoryMb) {
        String name = "lms-grade-" + UUID.randomUUID();
        List<String> command = new ArrayList<>(List.of("docker", "create", "--name", name,
                "--network", "none", "--cpus", "1", "--memory", memoryMb + "m",
                "--memory-swap", memoryMb + "m", "--pids-limit", "128", "--read-only",
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "10001:10001",
                "--ulimit", "core=0", "--ulimit", "nofile=128:128", "--tmpfs",
                "/work:rw,exec,nosuid,nodev,size=128m,uid=10001,gid=10001", "--tmpfs",
                "/tmp:rw,noexec,nosuid,nodev,size=32m,uid=10001,gid=10001", image, "sleep", "infinity"));
        String id = runChecked(command, 15_000).trim();
        var container = new Container(id);
        try {
            runChecked(List.of("docker", "start", id), 15_000);
        } catch (SandboxException error) {
            container.close();
            throw error;
        }
        return container;
    }

    private String runChecked(List<String> command, long timeoutMs) {
        try {
            var result = commands.run(command, new byte[0], Duration.ofMillis(timeoutMs), STDOUT_LIMIT, STDERR_LIMIT);
            if (result.timedOut() || result.exitCode() != 0)
                throw new SandboxException("Docker command failed: " + OutputText.decode(result.stderr()));
            return OutputText.decode(result.stdout());
        } catch (IOException | InterruptedException error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new SandboxException("Docker runtime unavailable", error);
        }
    }

    public final class Container implements Session {
        private final String id;
        private boolean closed;

        private Container(String id) { this.id = id; }

        @Override
        public void writeFile(String filename, byte[] content) {
            if (!filename.matches("[A-Za-z0-9_.-]{1,128}") || filename.equals(".") || filename.equals(".."))
                throw new IllegalArgumentException("Invalid sandbox filename");
            if (content.length > MAX_FILE_BYTES) throw new SandboxException("Source file exceeds the size limit");
            var result = exec(List.of("/bin/sh", "-c", "cat > /work/" + filename), content, 10_000);
            if (result.timedOut() || result.exitCode() != 0)
                throw new SandboxException("Could not transfer source file to sandbox: "
                        + OutputText.decode(result.stderr()));
        }

        @Override
        public DockerProcessRunner.Result exec(List<String> args, byte[] input, int timeoutMs) {
            var command = new ArrayList<>(List.of("docker", "exec", "-i", id));
            command.addAll(args);
            try {
                return commands.run(command, input, Duration.ofMillis(timeoutMs), STDOUT_LIMIT, STDERR_LIMIT);
            } catch (IOException | InterruptedException error) {
                if (error instanceof InterruptedException) Thread.currentThread().interrupt();
                throw new SandboxException("Sandbox execution failed", error);
            }
        }

        /** Hạ bộ nhớ container sau khi biên dịch (trình biên dịch cần nhiều RAM hơn giới hạn đề). */
        @Override
        public void resizeMemory(int memoryMb) {
            runChecked(List.of("docker", "update", "--memory", memoryMb + "m", "--memory-swap", memoryMb + "m", id),
                    15_000);
        }

        @Override
        public void close() {
            if (closed) return;
            closed = true;
            try { runChecked(List.of("docker", "rm", "-f", id), 15_000); }
            catch (SandboxException ignored) { }
        }
    }
}
