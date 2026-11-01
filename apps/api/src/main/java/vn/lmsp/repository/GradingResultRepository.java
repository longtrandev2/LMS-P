package vn.lmsp.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.GradingResult;

public interface GradingResultRepository extends JpaRepository<GradingResult, Long> {
    Optional<GradingResult> findTopBySubmission_IdOrderByAttemptNoDesc(Long submissionId);
    List<GradingResult> findAllBySubmission_IdOrderByAttemptNoDesc(Long submissionId);
}
