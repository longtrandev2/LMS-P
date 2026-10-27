package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.AssignmentSection;
import java.util.List;

public interface AssignmentSectionRepository extends JpaRepository<AssignmentSection, Long> {
    List<AssignmentSection> findAllByAssignment_IdOrderByPositionAsc(Long assignmentId);
}
