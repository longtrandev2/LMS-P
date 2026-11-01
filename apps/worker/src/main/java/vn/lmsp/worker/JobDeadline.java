package vn.lmsp.worker;

import java.util.function.LongSupplier;

/**
 * Thời gian tối đa của một job: `max(60 s, Σ giới hạn test thực × 1,5 + 30 s)` — docs/assessment-spec.md §5.
 * Quá hạn là lỗi hạ tầng (`SYSTEM_ERROR`), không phải TLE.
 */
public final class JobDeadline {
    static final long MIN_BUDGET_MS = 60_000;
    static final long EXTRA_MS = 30_000;

    private final long budgetMs;
    private final long startedMs;
    private final LongSupplier clockMs;

    JobDeadline(long budgetMs, LongSupplier clockMs) {
        this.budgetMs = budgetMs;
        this.clockMs = clockMs;
        this.startedMs = clockMs.getAsLong();
    }

    public static JobDeadline start(ExecutionRequest request) {
        return new JobDeadline(budgetMs(request), () -> System.nanoTime() / 1_000_000);
    }

    public static long budgetMs(ExecutionRequest request) {
        long perTest = request.profile().realTimeLimitMs(request.timeLimitMs());
        long sum = perTest * request.tests().size();
        return Math.max(MIN_BUDGET_MS, sum * 3 / 2 + EXTRA_MS);
    }

    public long budgetMs() { return budgetMs; }
    public long elapsedMs() { return clockMs.getAsLong() - startedMs; }
    public long remainingMs() { return budgetMs - elapsedMs(); }

    public void ensureTime() {
        if (remainingMs() <= 0) throw new JobTimeoutException();
    }

    public static final class JobTimeoutException extends RuntimeException {
        public JobTimeoutException() { super("Grading job exceeded its total time budget"); }
    }
}
