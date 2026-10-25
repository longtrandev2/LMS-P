package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Submission;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(Long attemptId);
    List<Submission> findAllByAssignment_IdAndStudent_IdOrderBySubmittedAtDesc(Long assignmentId, Long studentId);
    List<Submission> findAllByAssignment_IdOrderBySubmittedAtDesc(Long assignmentId);
    Optional<Submission> findByIdempotencyKey(String key);
    long countByAssignment_IdAndStudent_IdAndQuestion_Id(Long assignmentId, Long studentId, Long questionId);
}
