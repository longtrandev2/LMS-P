package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.GradingJob;

public interface GradingJobRepository extends JpaRepository<GradingJob, Long> {
    Optional<GradingJob> findByJobId(String jobId);
    /** Job mới nhất của submission; event của job cũ hơn bị bỏ qua (chấm lại). */
    Optional<GradingJob> findTopBySubmission_IdOrderByAttemptNoDesc(Long submissionId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from GradingJob j where j.publishedAt is null and j.nextAttemptAt <= :now order by j.id")
    List<GradingJob> findPending(@Param("now") LocalDateTime now, Pageable pageable);
}
