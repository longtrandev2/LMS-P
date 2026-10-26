package vn.lmsp.worker;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiFunction;

/** Sandbox giả cho unit test: ghi lại lệnh, trả kết quả theo hàm `respond(command, stdin)`. */
class FakeSandbox implements SandboxRunner {
    final List<Integer> openedMemory = new ArrayList<>();
    final List<Integer> resizedMemory = new ArrayList<>();
    final List<List<String>> commands = new ArrayList<>();
    final List<String> files = new ArrayList<>();
    int closed;
    int failOpens;
    BiFunction<List<String>, String, DockerProcessRunner.Result> respond;

    FakeSandbox(BiFunction<List<String>, String, DockerProcessRunner.Result> respond) { this.respond = respond; }

    static DockerProcessRunner.Result ok(String stdout) { return result(0, stdout, ""); }

    static DockerProcessRunner.Result result(int exit, String stdout, String stderr) {
        return new DockerProcessRunner.Result(exit, stdout.getBytes(StandardCharsets.UTF_8),
                stderr.getBytes(StandardCharsets.UTF_8), false);
    }

    /** Kết quả `lmsp-run`: stdout chương trình + dòng báo cáo ở stderr. */
    static DockerProcessRunner.Result run(String stdout, int exit, int ms, boolean oom, boolean memoryError) {
        return result(0, stdout, "LMSP " + exit + " " + ms + " " + (oom ? 1 : 0) + " " + (memoryError ? 1 : 0) + "\n");
    }

    static boolean isTest(List<String> command) { return command.get(0).equals(CodeExecutor.RUNNER); }

    @Override
    public Session open(int memoryMb) {
        if (failOpens > 0) {
            failOpens--;
            throw new SandboxException("docker create failed");
        }
        openedMemory.add(memoryMb);
        return new Session() {
            @Override public void writeFile(String filename, byte[] content) { files.add(filename); }

            @Override public DockerProcessRunner.Result exec(List<String> command, byte[] stdin, int timeoutMs) {
                commands.add(List.copyOf(command));
                return respond.apply(command, new String(stdin, StandardCharsets.UTF_8));
            }

            @Override public void resizeMemory(int memory) { resizedMemory.add(memory); }

            @Override public void close() { closed++; }
        };
    }
}
