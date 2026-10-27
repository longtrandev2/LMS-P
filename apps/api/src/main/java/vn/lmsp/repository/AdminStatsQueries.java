package vn.lmsp.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.lmsp.dto.AdminDtos.TopClass;
import vn.lmsp.dto.AdminDtos.Totals;
import vn.lmsp.dto.AdminDtos.UserTotals;

/**
 * Truy vấn gộp cho `GET /admin/stats` — docs/admin-spec.md §2. DB lưu UTC; ngày VN = `DATE(cột + 7 giờ)`
 * (Việt Nam không đổi giờ). Khoảng `[from, to)` là mốc UTC của đầu ngày VN, nên lọc theo cột vẫn dùng được index.
 */
@Repository
@RequiredArgsConstructor
public class AdminStatsQueries {
    /** Trần số mẫu độ trễ đọc lên để tính p95 trong Java. */
    public static final int LATENCY_CAP = 100_000;
    private final JdbcTemplate jdbc;

    public record DayCount(LocalDate date, long objective, long code) { }
    public record DayValue(LocalDate date, long value) { }
    public record VerdictCount(String status, String verdict, long count) { }

    private static final String TOTALS = """
            SELECT
              (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'student') AS student,
              (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'lecturer') AS lecturer,
              (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'admin') AS admin,
              (SELECT COUNT(*) FROM users WHERE status = 'locked') AS locked,
              (SELECT COUNT(*) FROM classes WHERE status = 'active') AS active_classes,
              (SELECT COUNT(*) FROM submissions WHERE submitted_at >= ? AND submitted_at < ?) AS submissions_today,
              (SELECT COUNT(*) FROM attempt_sessions WHERE status = 'in_progress') AS sessions_in_progress
            """;

    public Totals totals(LocalDateTime todayFrom, LocalDateTime todayTo) {
        return jdbc.queryForObject(TOTALS, (rs, i) -> new Totals(
                new UserTotals(rs.getLong("student"), rs.getLong("lecturer"), rs.getLong("admin"), rs.getLong("locked")),
                rs.getLong("active_classes"), rs.getLong("submissions_today"), rs.getLong("sessions_in_progress")),
                todayFrom, todayTo);
    }

    public List<DayCount> submissionsByDay(LocalDateTime from, LocalDateTime to) {
        return jdbc.query("""
                SELECT DATE(submitted_at + INTERVAL 7 HOUR) AS d, SUM(type = 'mcq') AS objective, SUM(type = 'code') AS code
                FROM submissions WHERE submitted_at >= ? AND submitted_at < ? GROUP BY d
                """, (rs, i) -> new DayCount(rs.getObject("d", LocalDate.class), rs.getLong("objective"),
                rs.getLong("code")), from, to);
    }

    public List<DayValue> newUsersByDay(LocalDateTime from, LocalDateTime to) {
        return jdbc.query("""
                SELECT DATE(created_at + INTERVAL 7 HOUR) AS d, COUNT(*) AS n
                FROM users WHERE created_at >= ? AND created_at < ? GROUP BY d
                """, (rs, i) -> new DayValue(rs.getObject("d", LocalDate.class), rs.getLong("n")), from, to);
    }

    /** Độ trễ (ms) của lần chấm đầu tiên mỗi bài code, theo ngày nộp. */
    public List<DayValue> gradingLatencies(LocalDateTime from, LocalDateTime to) {
        return jdbc.query("""
                SELECT x.d, x.ms FROM (
                  SELECT DATE(s.submitted_at + INTERVAL 7 HOUR) AS d,
                         TIMESTAMPDIFF(MICROSECOND, s.submitted_at,
                           (SELECT MIN(g.graded_at) FROM grading_results g WHERE g.submission_id = s.id)) DIV 1000 AS ms
                  FROM submissions s
                  WHERE s.type = 'code' AND s.submitted_at >= ? AND s.submitted_at < ?
                ) x WHERE x.ms IS NOT NULL LIMIT ?
                """, (rs, i) -> new DayValue(rs.getObject("d", LocalDate.class), rs.getLong("ms")), from, to, LATENCY_CAP);
    }

    public List<VerdictCount> codeVerdicts(LocalDateTime from, LocalDateTime to) {
        return jdbc.query("""
                SELECT status, verdict, COUNT(*) AS n FROM submissions
                WHERE type = 'code' AND submitted_at >= ? AND submitted_at < ? GROUP BY status, verdict
                """, (rs, i) -> new VerdictCount(rs.getString("status"), rs.getString("verdict"), rs.getLong("n")), from, to);
    }

    public List<TopClass> topClasses(LocalDateTime from, LocalDateTime to, int limit) {
        return jdbc.query("""
                SELECT c.id, c.code, c.name, COUNT(*) AS n
                FROM submissions s JOIN assignments a ON a.id = s.assignment_id JOIN classes c ON c.id = a.class_id
                WHERE s.submitted_at >= ? AND s.submitted_at < ?
                GROUP BY c.id, c.code, c.name ORDER BY n DESC, c.id LIMIT ?
                """, (rs, i) -> new TopClass(rs.getLong("id"), rs.getString("code"), rs.getString("name"), rs.getLong("n")),
                from, to, limit);
    }
}
