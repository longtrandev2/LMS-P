package vn.lmsp.enums;

/** Verdict chấm code — docs/assessment-spec.md §5. OK chỉ dùng cho run job (test không có expected). */
public enum GradingVerdict {
    AC, WA, CE, TLE, MLE, RE, OLE, OK, SYSTEM_ERROR
}
