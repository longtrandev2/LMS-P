package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.AssignmentQuestion;
import java.util.List;
import java.util.Optional;

public interface AssignmentQuestionRepository extends JpaRepository<AssignmentQuestion, Long> {
    List<AssignmentQuestion> findAllByAssignment_IdOrderByPositionAscIdAsc(Long assignmentId);
    Optional<AssignmentQuestion> findByAssignment_IdAndQuestion_Id(Long assignmentId, Long questionId);
    void deleteAllByAssignment_Id(Long assignmentId);
    long countByAssignment_Id(Long assignmentId);
}
