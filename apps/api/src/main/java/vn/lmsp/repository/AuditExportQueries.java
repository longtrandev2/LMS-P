package vn.lmsp.repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Đọc `audit_logs` theo lô cho xuất CSV (docs/admin-spec.md §7): cùng bộ lọc với `AuditLogRepository.search`,
 * mới nhất trước, phân trang keyset `(created_at, id)` để bộ nhớ không phụ thuộc số dòng.
 */
@Repository
@RequiredArgsConstructor
public class AuditExportQueries {
    private final JdbcTemplate jdbc;

    public record Filter(Long actorId, String action, String entityType, LocalDateTime from, LocalDateTime to) { }
    public record Row(Long id, LocalDateTime createdAt, Long actorId, String actorName, String action, String entityType,
                      Long entityId, String ip, String oldValue, String newValue) { }

    /** `after` = dòng cuối của lô trước (null cho lô đầu). */
    public List<Row> batch(Filter filter, Row after, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT a.id, a.created_at, a.actor_id, u.full_name, a.action, a.entity_type, a.entity_id, a.ip,
                       a.old_value, a.new_value
                FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE 1 = 1""");
        List<Object> args = new ArrayList<>();
        condition(sql, args, " AND a.actor_id = ?", filter.actorId());
        condition(sql, args, " AND a.action = ?", filter.action());
        condition(sql, args, " AND a.entity_type = ?", filter.entityType());
        condition(sql, args, " AND a.created_at >= ?", filter.from());
        condition(sql, args, " AND a.created_at < ?", filter.to());
        if (after != null) {
            sql.append(" AND (a.created_at < ? OR (a.created_at = ? AND a.id < ?))");
            args.add(after.createdAt()); args.add(after.createdAt()); args.add(after.id());
        }
        sql.append(" ORDER BY a.created_at DESC, a.id DESC LIMIT ?");
        args.add(limit);
        return jdbc.query(sql.toString(), (rs, i) -> new Row(rs.getLong("id"),
                rs.getObject("created_at", LocalDateTime.class), rs.getObject("actor_id", Long.class),
                rs.getString("full_name"), rs.getString("action"), rs.getString("entity_type"),
                rs.getObject("entity_id", Long.class), rs.getString("ip"), rs.getString("old_value"),
                rs.getString("new_value")), args.toArray());
    }

    private static void condition(StringBuilder sql, List<Object> args, String clause, Object value) {
        if (value == null) return;
        sql.append(clause);
        args.add(value);
    }
}
