package vn.lmsp.worker;

/** Phân loại verdict một test từ kết quả process — docs/assessment-spec.md §5. */
public final class VerdictClassifier {
    /** `timeout --signal=KILL` trả 137 khi hết giờ; 124 nếu chương trình tự thoát sau tín hiệu. */
    private static final int TIMEOUT_EXIT = 124;
    private static final int KILLED_EXIT = 137;
    /** Sai số đo `date` quanh `timeout` để nhận ra lần bị giết do hết giờ. */
    private static final int TIMER_TOLERANCE_MS = 20;

    private VerdictClassifier() { }

    /**
     * Verdict khi chương trình không chạy xong bình thường, hoặc null nếu cần so output bằng checker.
     * Output vượt 64 KiB (OLE) được nhận ra trước khi có báo cáo, xem {@link CodeExecutor}.
     */
    public static GradingVerdict classify(RunReport report, int realLimitMs) {
        if (report.oomKilled()) return GradingVerdict.MLE;
        boolean killed = report.exitCode() == KILLED_EXIT || report.exitCode() == TIMEOUT_EXIT;
        if (killed && report.elapsedMs() >= realLimitMs - TIMER_TOLERANCE_MS) return GradingVerdict.TLE;
        if (report.exitCode() != 0 && report.memoryError()) return GradingVerdict.MLE;
        if (report.exitCode() != 0) return GradingVerdict.RE;
        return null;
    }

    public static GradingVerdict check(OutputChecker checker, String output, String expected) {
        if (expected == null) return GradingVerdict.OK;
        return checker.accepts(output, expected) ? GradingVerdict.AC : GradingVerdict.WA;
    }
}
