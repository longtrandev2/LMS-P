package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AssignmentSection;
import java.util.List;

public interface AssignmentSectionRepository extends JpaRepository<AssignmentSection, Long> {
    List<AssignmentSection> findAllByAssignment_IdOrderByPositionAsc(Long assignmentId);
    @Modifying(flushAutomatically = true)
    @Query("delete from AssignmentSection e where e.assignment.id = :assignmentId")
    void deleteByAssignmentId(@Param("assignmentId") Long assignmentId);
}
