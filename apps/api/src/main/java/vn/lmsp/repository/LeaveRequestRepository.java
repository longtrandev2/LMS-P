package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.model.LeaveRequest;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    @EntityGraph(attributePaths = {"session", "student", "reviewer"})
    @Query(value = "select l from LeaveRequest l where l.classId=:classId and (:studentId is null or l.student.id=:studentId)"
            + " and (:status is null or l.status=:status)",
           countQuery = "select count(l) from LeaveRequest l where l.classId=:classId and (:studentId is null or l.student.id=:studentId)"
            + " and (:status is null or l.status=:status)")
    Page<LeaveRequest> search(@Param("classId") Long classId, @Param("studentId") Long studentId,
                              @Param("status") LeaveRequestStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"session", "student", "reviewer"})
    Optional<LeaveRequest> findWithDetailsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LeaveRequest l where l.id=:id")
    Optional<LeaveRequest> findLockedById(@Param("id") Long id);

    boolean existsBySession_IdAndStudent_IdAndStatusIn(Long sessionId, Long studentId, Collection<LeaveRequestStatus> statuses);
    boolean existsBySession_Id(Long sessionId);

    /** Đơn không bị hủy của các buổi, mới nhất trước; studentId null = mọi sinh viên. */
    @EntityGraph(attributePaths = {"session", "student", "reviewer"})
    @Query("select l from LeaveRequest l where l.session.id in :sessionIds and l.status<>vn.lmsp.enums.LeaveRequestStatus.cancelled"
            + " and (:studentId is null or l.student.id=:studentId) order by l.createdAt desc, l.id desc")
    List<LeaveRequest> findActiveBySessions(@Param("sessionIds") Collection<Long> sessionIds, @Param("studentId") Long studentId);
}
