package vn.lmsp.service;

/** Bài vừa được xuất bản (single hoặc bulk); thông báo gửi sau khi transaction commit — docs/admin-spec.md §8. */
public record AssignmentPublishedEvent(Long assignmentId) { }
