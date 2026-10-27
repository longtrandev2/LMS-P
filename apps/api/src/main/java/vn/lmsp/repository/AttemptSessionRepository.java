package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.AttemptSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttemptSessionRepository extends JpaRepository<AttemptSession, Long> {
    Optional<AttemptSession> findFirstByAssignment_IdAndStudent_IdAndStatus(Long assignmentId, Long studentId, AttemptSessionStatus status);
    List<AttemptSession> findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(Long assignmentId, Long studentId);
    long countByAssignment_IdAndStudent_Id(Long assignmentId, Long studentId);
    List<AttemptSession> findAllByAssignment_IdOrderByStudent_IdAscAttemptNoDesc(Long assignmentId);
    Optional<AttemptSession> findByAssignmentAttempt_Id(Long attemptId);
    List<AttemptSession> findAllByStudent_IdOrderByStartedAtDescIdDesc(Long studentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AttemptSession s where s.id = :id")
    Optional<AttemptSession> findForUpdate(@Param("id") Long id);

    /** Phiên đang làm đã quá `ends_at` + ân hạn — scheduler tự nộp (exam-spec.md §5.6). */
    @Query("select s.id from AttemptSession s where s.status = vn.lmsp.enums.AttemptSessionStatus.in_progress and s.endsAt < :before order by s.endsAt")
    List<Long> findDueIds(@Param("before") LocalDateTime before, Pageable page);

    /** Chuyển `in_progress → submitted` có điều kiện; trả 1 nếu lời gọi này giành được quyền nộp. */
    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("update AttemptSession s set s.status = vn.lmsp.enums.AttemptSessionStatus.submitted, s.submitReason = :reason, "
            + "s.submittedAt = :now where s.id = :id and s.status = vn.lmsp.enums.AttemptSessionStatus.in_progress")
    int claimSubmit(@Param("id") Long id, @Param("reason") SubmitReason reason, @Param("now") LocalDateTime now);
}
