package vn.lmsp.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.model.AttendanceRecord;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySession_Id(Long sessionId);
    Optional<AttendanceRecord> findBySession_IdAndStudentId(Long sessionId, Long studentId);
    List<AttendanceRecord> findBySession_IdInAndStudentId(Collection<Long> sessionIds, Long studentId);
    boolean existsBySession_Id(Long sessionId);

    interface StatusCount { Long getStudentId(); AttendanceStatus getStatus(); Number getTotal(); }

    /**
     * Số bản ghi theo sinh viên × trạng thái trên các buổi không hủy đã diễn ra hoặc đã điểm danh
     * (cùng điều kiện "due" với ClassSessionRepository.totals). studentId null = mọi sinh viên.
     */
    @Query("select r.studentId as studentId, r.status as status, count(r) as total from AttendanceRecord r join r.session s"
            + " where s.lmsClass.id=:classId and s.cancelled=false and (s.endsAt < :now or s.attendanceTakenAt is not null)"
            + " and (:studentId is null or r.studentId=:studentId) group by r.studentId, r.status")
    List<StatusCount> countByStatus(@Param("classId") Long classId, @Param("studentId") Long studentId,
                                    @Param("now") LocalDateTime now);
}
