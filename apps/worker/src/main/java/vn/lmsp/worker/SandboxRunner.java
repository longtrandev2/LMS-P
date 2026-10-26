package vn.lmsp.worker;

import java.util.List;

/** Cấp sandbox cho một job; tách interface để test {@link CodeExecutor} không cần Docker. */
public interface SandboxRunner {
    int STDOUT_LIMIT = 64 * 1024;

    Session open(int memoryMb);

    interface Session extends AutoCloseable {
        void writeFile(String filename, byte[] content);

        /**
         * Chạy lệnh trong sandbox. stdout vượt {@link #STDOUT_LIMIT} ném
         * {@link DockerProcessRunner.OutputLimitException}; lỗi hạ tầng ném {@link SandboxException}.
         */
        DockerProcessRunner.Result exec(List<String> command, byte[] stdin, int timeoutMs);

        void resizeMemory(int memoryMb);

        @Override void close();
    }
}
