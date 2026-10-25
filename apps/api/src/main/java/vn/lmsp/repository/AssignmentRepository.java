package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.Assignment;
import java.util.List;
import java.util.Optional;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findAllByLmsClass_IdOrderByCreatedAtDescIdDesc(Long classId);
    List<Assignment> findAllByLmsClass_IdAndPublishedTrueOrderByDueAtAscIdAsc(Long classId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Assignment a where a.id=:id")
    Optional<Assignment> findLockedById(@Param("id") Long id);
}
