package vn.lmsp.dto;

/**
 * Thống kê điểm danh của một sinh viên trong một lớp (chỉ buổi không hủy) — docs/class-schedule-grades-spec.md §3.
 * `total` = số buổi không hủy; `unmarked` = buổi đã diễn ra hoặc đã điểm danh nhưng sinh viên chưa có bản ghi.
 */
public record AttendanceCounts(int total, int present, int late, int excused, int absent, int unmarked) {
    public int absences() { return excused + absent; }
}
