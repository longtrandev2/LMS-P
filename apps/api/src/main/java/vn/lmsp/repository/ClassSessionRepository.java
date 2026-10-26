package vn.lmsp.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.ClassSession;
import java.time.LocalDate;
import java.util.List;

public interface ClassSessionRepository extends JpaRepository<ClassSession, Long> {
    /** Buổi học của một lớp trong khoảng ngày (from/to null → không giới hạn), sắp xếp ngày+giờ. */
    @Query("select s from ClassSession s where s.lmsClass.id=:classId and s.sessionDate>=:from and s.sessionDate<=:to order by s.sessionDate asc, s.startTime asc, s.id asc")
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course"})
    List<ClassSession> byClassInRange(@Param("classId") Long classId, @Param("from") LocalDate from, @Param("to") LocalDate to);
    /** Lịch học gộp nhiều lớp (me/schedule, me/teaching-schedule). */
    @Query("select s from ClassSession s where s.lmsClass.id in :classIds and s.sessionDate>=:from and s.sessionDate<=:to order by s.sessionDate asc, s.startTime asc, s.id asc")
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course"})
    List<ClassSession> byClassesInRange(@Param("classIds") List<Long> classIds, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
