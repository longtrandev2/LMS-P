package vn.lmsp.worker;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Một lần chạy code trên bộ test, dùng chung cho bài nộp chính thức và run job.
 * Test đã sắp đúng thứ tự chạy; `expectedOutput` null = chỉ lấy output (verdict `OK`).
 */
public record ExecutionRequest(String language, String sourceCode, int timeLimitMs, int memoryLimitMb,
        OutputChecker checker, int outputLimitBytes, boolean stopOnFailure, List<TestInput> tests) {

    public static final int MAX_SOURCE_BYTES = 128 * 1024;
    public static final int MAX_TEST_FIELD_BYTES = 128 * 1024;
    public static final int MAX_TOTAL_TEST_BYTES = 2 * 1024 * 1024;
    /** Đặc tả mới: 1–100 test, 100–10000 ms, 32–1024 MB; vẫn nhận giới hạn cũ để chấm snapshot cũ. */
    public static final int MAX_TESTS = 200;
    public static final int MIN_TIME_MS = 100, MAX_TIME_MS = 30_000;
    public static final int MIN_MEMORY_MB = 32, MAX_MEMORY_MB = 2048;
    public static final int MAX_OUTPUT_LIMIT = 64 * 1024;

    public record TestInput(int position, String input, String expectedOutput) { }

    public ExecutionRequest {
        if (!LanguageProfile.supports(language)) throw new IllegalArgumentException("Unsupported language");
        if (sourceCode == null || bytes(sourceCode) > MAX_SOURCE_BYTES)
            throw new IllegalArgumentException("Invalid source size");
        if (timeLimitMs < MIN_TIME_MS || timeLimitMs > MAX_TIME_MS
                || memoryLimitMb < MIN_MEMORY_MB || memoryLimitMb > MAX_MEMORY_MB)
            throw new IllegalArgumentException("Invalid sandbox limits");
        if (checker == null) throw new IllegalArgumentException("Missing checker");
        if (outputLimitBytes < 1 || outputLimitBytes > MAX_OUTPUT_LIMIT)
            throw new IllegalArgumentException("Invalid output limit");
        if (tests == null || tests.isEmpty() || tests.size() > MAX_TESTS)
            throw new IllegalArgumentException("Invalid test set");
        long total = 0;
        for (var test : tests) {
            if (test == null || test.input() == null) throw new IllegalArgumentException("Missing test input");
            int input = bytes(test.input());
            int expected = test.expectedOutput() == null ? 0 : bytes(test.expectedOutput());
            if (input > MAX_TEST_FIELD_BYTES || expected > MAX_TEST_FIELD_BYTES)
                throw new IllegalArgumentException("Test case too large");
            total += (long) input + expected;
        }
        if (total > MAX_TOTAL_TEST_BYTES) throw new IllegalArgumentException("Test set too large");
        tests = List.copyOf(tests);
    }

    public LanguageProfile profile() { return LanguageProfile.of(language); }

    private static int bytes(String value) { return value.getBytes(StandardCharsets.UTF_8).length; }
}
