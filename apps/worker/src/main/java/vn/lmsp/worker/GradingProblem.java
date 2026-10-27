package vn.lmsp.worker;

/** Bài nộp chính thức cần chấm: định danh job + yêu cầu chạy dựng từ snapshot đã ghim. */
public record GradingProblem(String jobId, long submissionId, ExecutionRequest request) { }
