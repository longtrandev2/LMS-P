package vn.lmsp.worker;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class DockerProcessRunner {
    public record Result(int exitCode, byte[] stdout, byte[] stderr, boolean timedOut) { }
    public static class OutputLimitException extends RuntimeException { }

    public Result run(List<String> command, byte[] stdin, Duration timeout, int maxOutputBytes)
            throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command).start();
        try (var tasks = Executors.newVirtualThreadPerTaskExecutor()) {
            var stdout = tasks.submit(() -> readBounded(process.getInputStream(), maxOutputBytes, process));
            var stderr = tasks.submit(() -> readBounded(process.getErrorStream(), maxOutputBytes, process));
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
                process.destroyForcibly();
                throw new OutputLimitException();
            }
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }

    private void writeInput(Process process, byte[] input) throws IOException {
        try (var stream = process.getOutputStream()) { stream.write(input); }
    }

    private byte[] get(java.util.concurrent.Future<byte[]> task) throws IOException, InterruptedException {
        try { return task.get(); }
        catch (ExecutionException error) {
            if (error.getCause() instanceof OutputLimitException limit) throw limit;
            throw new IOException("Could not read Docker command output", error.getCause());
        }
    }

    private byte[] safeGet(java.util.concurrent.Future<byte[]> task) {
        try { return task.get(1, TimeUnit.SECONDS); } catch (Exception ignored) { return new byte[0]; }
    }
}
