package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.TestCase;
import java.util.List;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    List<TestCase> findAllByQuestion_IdOrderByPositionAsc(Long questionId);
    void deleteAllByQuestion_Id(Long questionId);
}
