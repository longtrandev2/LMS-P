package vn.lmsp.worker;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Chạy lệnh `docker …` cục bộ: stdout vượt giới hạn thì dừng (OLE), stderr chỉ giữ phần đầu. */
public class DockerProcessRunner {
    public record Result(int exitCode, byte[] stdout, byte[] stderr, boolean timedOut) { }

    /** stdout vượt giới hạn; `partial` là phần đầu đã đọc được (tối đa đúng giới hạn). */
    public static class OutputLimitException extends RuntimeException {
        private final byte[] partial;
        public OutputLimitException(byte[] partial) { this.partial = partial; }
        public byte[] partial() { return partial; }
    }

    public Result run(List<String> command, byte[] stdin, Duration timeout, int stdoutLimit, int stderrLimit)
            throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command).start();
        try (var tasks = Executors.newVirtualThreadPerTaskExecutor()) {
            var stdout = tasks.submit(() -> readBounded(process.getInputStream(), stdoutLimit, process));
            var stderr = tasks.submit(() -> readHead(process.getErrorStream(), stderrLimit));
            var input = tasks.submit(() -> {
                writeInput(process, stdin);
                return null;
            });
            boolean finished;
            try { finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS); }
            catch (InterruptedException error) {
                process.destroyForcibly();
                throw error;
            }
            if (!finished) {
                process.destroyForcibly();
                return new Result(-1, safeGet(stdout), safeGet(stderr), true);
            }
            try { input.get(1, TimeUnit.SECONDS); }
            catch (ExecutionException | java.util.concurrent.TimeoutException ignored) { }
            return new Result(process.exitValue(), get(stdout), get(stderr), false);
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    private byte[] readBounded(InputStream stream, int limit, Process process) throws IOException {
        var output = new ByteArrayOutputStream(Math.min(limit, 4096));
        byte[] buffer = new byte[4096];
        int count;
        while ((count = stream.read(buffer)) >= 0) {
            if (output.size() + count > limit) {
                output.write(buffer, 0, limit - output.size());
                process.destroyForcibly();
                throw new OutputLimitException(output.toByteArray());
            }
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }

    private byte[] readHead(InputStream stream, int limit) throws IOException {
        var output = new ByteArrayOutputStream(Math.min(limit, 4096));
        byte[] buffer = new byte[4096];
        int count;
        while ((count = stream.read(buffer)) >= 0) {
            int keep = Math.min(count, limit - output.size());
            if (keep > 0) output.write(buffer, 0, keep);
        }
        return output.toByteArray();
    }

    private void writeInput(Process process, byte[] input) throws IOException {
        try (var stream = process.getOutputStream()) { stream.write(input); }
    }

    private byte[] get(Future<byte[]> task) throws IOException, InterruptedException {
        try { return task.get(); }
        catch (ExecutionException error) {
            if (error.getCause() instanceof OutputLimitException limit) throw limit;
            throw new IOException("Could not read Docker command output", error.getCause());
        }
    }

    private byte[] safeGet(Future<byte[]> task) {
        try { return task.get(1, TimeUnit.SECONDS); } catch (Exception ignored) { return new byte[0]; }
    }
}
