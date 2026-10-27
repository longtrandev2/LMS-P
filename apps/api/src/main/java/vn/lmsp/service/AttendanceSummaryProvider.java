package vn.lmsp.service;

import java.util.Map;
import vn.lmsp.dto.AttendanceCounts;

/**
 * Thống kê điểm danh theo lớp cho sổ điểm — docs/class-schedule-grades-spec.md §5.2.
 * Hiện thực: dịch vụ điểm danh (nhóm lịch học). Sổ điểm chỉ dùng interface này.
 */
public interface AttendanceSummaryProvider {
    /** Thống kê từng sinh viên đang học lớp (key = student_id); sinh viên chưa có bản ghi nào vẫn có mặt trong map. */
    Map<Long, AttendanceCounts> countsByStudent(Long classId);
}
