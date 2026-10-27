package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.AssignmentDrawRule;
import java.util.List;

public interface AssignmentDrawRuleRepository extends JpaRepository<AssignmentDrawRule, Long> {
    List<AssignmentDrawRule> findAllByAssignment_IdOrderByPositionAscIdAsc(Long assignmentId);
}
