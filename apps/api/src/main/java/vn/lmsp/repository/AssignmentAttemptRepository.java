package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AssignmentAttempt;
import java.util.List;
import java.util.Optional;

public interface AssignmentAttemptRepository extends JpaRepository<AssignmentAttempt, Long> {
    Optional<AssignmentAttempt> findByIdempotencyKey(String key);
    Optional<AssignmentAttempt> findByIdAndAssignment_Id(Long id, Long assignmentId);
    List<AssignmentAttempt> findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(Long assignmentId, Long studentId);
    List<AssignmentAttempt> findAllByAssignment_IdOrderByAttemptNoAsc(Long assignmentId);
    long countByAssignment_IdAndStudent_Id(Long assignmentId, Long studentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AssignmentAttempt a where a.id=:id")
    Optional<AssignmentAttempt> findForUpdate(@Param("id") Long id);
}
