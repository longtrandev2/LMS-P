package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.AssignmentAttempt;
import java.util.List;
import java.util.Optional;

public interface AssignmentAttemptRepository extends JpaRepository<AssignmentAttempt, Long> {
    Optional<AssignmentAttempt> findByIdempotencyKey(String key);
    List<AssignmentAttempt> findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(Long assignmentId, Long studentId);
    long countByAssignment_IdAndStudent_Id(Long assignmentId, Long studentId);
}
