package vn.lmsp.service;

/**
 * Kết quả kiểm tra đề (problem_check) mới nhất của một phiên bản câu lập trình — docs/assessment-spec.md §7.
 * Hiện thực: RunJobService. AssignmentService dùng khi xuất bản.
 */
public interface ProblemCheckGate {
    enum Status { PASSED, FAILED, UNVERIFIED }

    Status status(Long questionVersionId);
}
