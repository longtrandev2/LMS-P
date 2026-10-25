package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Submission;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Submission s where s.id=:id")
    Optional<Submission> findLockedById(@Param("id") Long id);
    List<Submission> findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(Long attemptId);
    List<Submission> findAllByAssignment_IdAndStudent_IdOrderBySubmittedAtDesc(Long assignmentId, Long studentId);
    List<Submission> findAllByAssignment_IdOrderBySubmittedAtDesc(Long assignmentId);
    Optional<Submission> findByIdempotencyKey(String key);
    long countByAssignment_IdAndStudent_IdAndQuestion_Id(Long assignmentId, Long studentId, Long questionId);
}
