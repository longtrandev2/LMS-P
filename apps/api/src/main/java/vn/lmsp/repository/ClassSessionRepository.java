package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.ClassSession;

public interface ClassSessionRepository extends JpaRepository<ClassSession, Long> {
    List<ClassSession> findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(Long classId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ClassSession s where s.id=:id")
    Optional<ClassSession> findLockedById(@Param("id") Long id);

    /** Buổi chưa điểm danh, không có bản ghi điểm danh, đơn xin nghỉ hay học liệu gắn kèm — được phép thay thế. */
    @Query("select s.id from ClassSession s where s.lmsClass.id=:classId and s.attendanceTakenAt is null"
            + " and not exists (select r.id from AttendanceRecord r where r.session=s)"
            + " and not exists (select l.id from LeaveRequest l where l.session=s)"
            + " and not exists (select m.id from Material m where m.sessionId=s.id)")
    List<Long> findReplaceableIds(@Param("classId") Long classId);

    @Modifying(flushAutomatically = true)
    @Query("delete from ClassSession s where s.id in :ids")
    int deleteByIds(@Param("ids") Collection<Long> ids);

    /** total = buổi không hủy; due = đã qua giờ kết thúc hoặc đã điểm danh; taken = đã điểm danh. */
    interface Totals { Number getTotal(); Number getDue(); Number getTaken(); }

    @Query("select count(s) as total,"
            + " coalesce(sum(case when s.endsAt < :now or s.attendanceTakenAt is not null then 1 else 0 end), 0) as due,"
            + " coalesce(sum(case when s.attendanceTakenAt is not null then 1 else 0 end), 0) as taken"
            + " from ClassSession s where s.lmsClass.id=:classId and s.cancelled=false")
    Totals totals(@Param("classId") Long classId, @Param("now") LocalDateTime now);

    @Query("select s from ClassSession s join fetch s.lmsClass where s.cancelled=false and s.upcomingNotifiedAt is null"
            + " and s.startsAt > :now and s.startsAt <= :until order by s.startsAt, s.id")
    List<ClassSession> findUpcomingToNotify(@Param("now") LocalDateTime now, @Param("until") LocalDateTime until);

    /** Đánh dấu đã gửi thông báo; trả 0 nếu đã có tiến trình khác đánh dấu trước (gửi đúng một lần). */
    @Modifying
    @Query("update ClassSession s set s.upcomingNotifiedAt=:now where s.id=:id and s.upcomingNotifiedAt is null")
    int markUpcomingNotified(@Param("id") Long id, @Param("now") LocalDateTime now);
}
