package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AssessmentPaper;
import java.util.List;

public interface AssessmentPaperRepository extends JpaRepository<AssessmentPaper, Long> {
    /** Đề dùng chung (`same`) hoặc các mã đề (`variants`); không gồm đề riêng `per_student`. */
    List<AssessmentPaper> findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(Long assignmentId);

    /** Số phiên đã gán cho mỗi đề — chia đều mã đề (exam-spec.md §5.2). Mỗi phần tử: [paper_id, count]. */
    @Query("select s.paper.id, count(s) from AttemptSession s where s.assignment.id = :assignmentId group by s.paper.id")
    List<Object[]> countSessionsByPaper(@Param("assignmentId") Long assignmentId);
}
