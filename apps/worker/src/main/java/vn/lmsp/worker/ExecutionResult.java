package vn.lmsp.worker;

import java.util.List;

/** Kết quả chạy một job: verdict tổng, log biên dịch, kết quả từng test đã chạy. */
public record ExecutionResult(boolean failed, GradingVerdict verdict, boolean compileError, String compileOutput,
        String errorMessage, int durationMs, Integer testsTotal, Integer testsPassed, Integer failedTest,
        List<TestOutcome> tests) {

    /** Kết quả một test; `memoryKb` null khi không đo được. */
    public record TestOutcome(int position, GradingVerdict verdict, int timeMs, Integer memoryKb, String output) { }

    /** Verdict tổng: `AC` nếu mọi test `AC`/`OK`, ngược lại verdict của test lỗi đầu tiên. */
    public static ExecutionResult of(List<TestOutcome> tests, int testsTotal, long durationMs) {
        GradingVerdict verdict = GradingVerdict.AC;
        Integer failedTest = null;
        int passed = 0;
        for (var test : tests) {
            if (test.verdict().passed()) {
                passed++;
            } else if (failedTest == null) {
                failedTest = test.position();
                verdict = test.verdict();
            }
        }
        return new ExecutionResult(false, verdict, false, null, null, clamp(durationMs), testsTotal, passed,
                failedTest, List.copyOf(tests));
    }

    public static ExecutionResult compileError(String log, int testsTotal, long durationMs) {
        return new ExecutionResult(false, GradingVerdict.CE, true, log, null, clamp(durationMs), testsTotal, 0,
                null, List.of());
    }

    /** Lỗi hạ tầng: `status = failed`, `verdict = SYSTEM_ERROR`. */
    public static ExecutionResult failure(String message, long durationMs) {
        return new ExecutionResult(true, GradingVerdict.SYSTEM_ERROR, false, null, message, clamp(durationMs),
                null, null, null, List.of());
    }

    private static int clamp(long durationMs) { return (int) Math.max(0, Math.min(3_600_000, durationMs)); }
}
