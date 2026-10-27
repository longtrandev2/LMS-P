package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AssignmentDrawRule;
import java.util.List;

public interface AssignmentDrawRuleRepository extends JpaRepository<AssignmentDrawRule, Long> {
    List<AssignmentDrawRule> findAllByAssignment_IdOrderByPositionAscIdAsc(Long assignmentId);
    @Modifying(flushAutomatically = true)
    @Query("delete from AssignmentDrawRule e where e.assignment.id = :assignmentId")
    void deleteByAssignmentId(@Param("assignmentId") Long assignmentId);
}
