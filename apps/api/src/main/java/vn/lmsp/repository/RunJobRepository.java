package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.model.RunJob;

public interface RunJobRepository extends JpaRepository<RunJob, Long> {
    Optional<RunJob> findByJobId(String jobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RunJob r where r.jobId=:jobId")
    Optional<RunJob> findLockedByJobId(@Param("jobId") String jobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RunJob r where r.publishedAt is null and r.nextAttemptAt <= :now order by r.id")
    List<RunJob> findPending(@Param("now") LocalDateTime now, Pageable pageable);

    Optional<RunJob> findFirstByQuestionVersionIdAndKindOrderByCreatedAtDescIdDesc(Long questionVersionId, RunJobKind kind);
}
