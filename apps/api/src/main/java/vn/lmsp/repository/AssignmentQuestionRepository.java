package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AssignmentQuestion;
import java.util.List;
import java.util.Optional;

public interface AssignmentQuestionRepository extends JpaRepository<AssignmentQuestion, Long> {
    List<AssignmentQuestion> findAllByAssignment_IdOrderByPositionAscIdAsc(Long assignmentId);
    Optional<AssignmentQuestion> findByAssignment_IdAndQuestion_Id(Long assignmentId, Long questionId);
    void deleteAllByAssignment_Id(Long assignmentId);
    long countByAssignment_Id(Long assignmentId);
    /** Xóa ngay bằng một câu lệnh (trước khi chèn lại cấu trúc đề, tránh trùng khóa UNIQUE). */
    @Modifying(flushAutomatically = true)
    @Query("delete from AssignmentQuestion q where q.assignment.id = :assignmentId")
    void deleteBlueprintLinks(@Param("assignmentId") Long assignmentId);
}
