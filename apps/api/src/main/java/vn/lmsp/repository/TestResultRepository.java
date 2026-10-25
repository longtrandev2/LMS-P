package vn.lmsp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.TestResult;

public interface TestResultRepository extends JpaRepository<TestResult, Long> {
    List<TestResult> findAllByResult_IdOrderByPositionAsc(Long resultId);
}
