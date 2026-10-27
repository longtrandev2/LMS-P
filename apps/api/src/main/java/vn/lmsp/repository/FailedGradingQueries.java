package vn.lmsp.repository;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.lmsp.dto.AdminDtos.FailedSubmission;

/** Bài code chấm lỗi (`submissions.status = failed`) cho màn Vận hành — docs/admin-spec.md §4. Một truy vấn mỗi trang. */
@Repository
@RequiredArgsConstructor
public class FailedGradingQueries {
    private static final String FAILED = "s.status = 'failed' AND s.type = 'code'";
    private final JdbcTemplate jdbc;

    public long count() {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM submissions s WHERE " + FAILED, Long.class);
        return total == null ? 0 : total;
    }

    /** Mới nhất trước; lỗi lấy từ lần chấm gần nhất, số lần chấm = số job đã tạo. */
    public List<FailedSubmission> page(int limit, int offset) {
        return jdbc.query("""
                SELECT s.id, s.assignment_id, a.title, c.code AS class_code, u.full_name, u.student_code, s.language,
                       s.submitted_at,
                       (SELECT g.error_message FROM grading_results g WHERE g.submission_id = s.id
                        ORDER BY g.attempt_no DESC LIMIT 1) AS error_message,
                       (SELECT COUNT(*) FROM grading_jobs j WHERE j.submission_id = s.id) AS grading_attempts
                FROM submissions s
                JOIN assignments a ON a.id = s.assignment_id
                JOIN classes c ON c.id = a.class_id
                JOIN users u ON u.id = s.student_id
                WHERE %s
                ORDER BY s.submitted_at DESC, s.id DESC
                LIMIT ? OFFSET ?
                """.formatted(FAILED), (rs, i) -> new FailedSubmission(rs.getLong("id"), rs.getLong("assignment_id"),
                rs.getString("title"), rs.getString("class_code"), rs.getString("full_name"), rs.getString("student_code"),
                rs.getString("language"), rs.getObject("submitted_at", LocalDateTime.class), rs.getString("error_message"),
                rs.getInt("grading_attempts")), limit, offset);
    }

    /** Id các bài còn `failed`, cũ nhất trước, tối đa `limit`. */
    public List<Long> failedIds(int limit) {
        return jdbc.queryForList("SELECT s.id FROM submissions s WHERE " + FAILED + " ORDER BY s.id LIMIT ?",
                Long.class, limit);
    }
}
