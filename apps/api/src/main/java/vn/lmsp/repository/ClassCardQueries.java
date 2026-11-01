package vn.lmsp.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

/**
 * Số liệu thẻ lớp của sinh viên (`GET /me/classes`) — docs/class-schedule-grades-spec.md §6.
 * Mỗi chỉ số là một truy vấn gộp theo danh sách lớp (không N+1).
 */
@Repository
public class ClassCardQueries {
    @PersistenceContext private EntityManager em;

    public record SessionStats(long total, long held, LocalDateTime next) { }

    public Map<Long, SessionStats> sessionStats(Collection<Long> classIds, LocalDateTime now) {
        Map<Long, SessionStats> result = new HashMap<>();
        rows("select s.lmsClass.id, count(s), sum(case when s.endsAt < :now then 1 else 0 end),"
                + " min(case when s.startsAt > :now then s.startsAt end)"
                + " from ClassSession s where s.lmsClass.id in :ids and s.cancelled = false group by s.lmsClass.id",
                classIds, now, null).forEach(row -> result.put((Long) row[0],
                new SessionStats(number(row[1]), number(row[2]), (LocalDateTime) row[3])));
        return result;
    }

    public Map<Long, Long> attendedSessions(Collection<Long> classIds, Long studentId) {
        return counts("select s.lmsClass.id, count(r) from AttendanceRecord r join r.session s"
                + " where s.lmsClass.id in :ids and s.cancelled = false and r.studentId = :studentId"
                + " and r.status in (vn.lmsp.enums.AttendanceStatus.present, vn.lmsp.enums.AttendanceStatus.late)"
                + " group by s.lmsClass.id", classIds, null, studentId);
    }

    public Map<Long, Long> materials(Collection<Long> classIds) {
        return counts("select m.lmsClass.id, count(m) from Material m where m.lmsClass.id in :ids group by m.lmsClass.id",
                classIds, null, null);
    }

    /** Bài đã xuất bản, đã mở và còn hạn nộp (kể cả hạn nộp muộn). */
    public Map<Long, Long> openAssignments(Collection<Long> classIds, LocalDateTime now) {
        return counts("select a.lmsClass.id, count(a) from Assignment a where a.lmsClass.id in :ids and a.published = true"
                + " and (a.availableFrom is null or a.availableFrom <= :now)"
                + " and (a.dueAt > :now or (a.allowLate = true and a.lateDueAt > :now)) group by a.lmsClass.id",
                classIds, now, null);
    }

    private Map<Long, Long> counts(String jpql, Collection<Long> ids, LocalDateTime now, Long studentId) {
        Map<Long, Long> result = new HashMap<>();
        rows(jpql, ids, now, studentId).forEach(row -> result.put((Long) row[0], number(row[1])));
        return result;
    }

    private List<Object[]> rows(String jpql, Collection<Long> ids, LocalDateTime now, Long studentId) {
        if (ids.isEmpty()) return List.of();
        var query = em.createQuery(jpql, Object[].class).setParameter("ids", ids);
        if (now != null) query.setParameter("now", now);
        if (studentId != null) query.setParameter("studentId", studentId);
        return query.getResultList();
    }

    private static long number(Object value) { return value == null ? 0 : ((Number) value).longValue(); }
}
