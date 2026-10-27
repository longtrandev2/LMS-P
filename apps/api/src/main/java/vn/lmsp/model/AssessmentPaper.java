package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import vn.lmsp.common.UtcTime;

/** Một đề đã sinh: đề chung, một mã đề (`code`), hoặc đề riêng của sinh viên (`student`) — docs/exam-spec.md §3.3. */
@Entity
@Table(name = "assessment_papers", uniqueConstraints = @UniqueConstraint(name = "uq_assessment_paper_code", columnNames = {"assignment_id", "code"}))
@Getter
public class AssessmentPaper {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @Column(length = 10) private String code;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id") private User student;
    @Column(name = "total_points", nullable = false, precision = 8, scale = 2) private BigDecimal totalPoints;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected AssessmentPaper() { }
    public AssessmentPaper(Assignment assignment, String code, User student, BigDecimal totalPoints) {
        this.assignment = assignment; this.code = code; this.student = student; this.totalPoints = totalPoints;
    }
    @PrePersist void onCreate() { createdAt = UtcTime.now(); }
    public Long getAssignmentId() { return assignment.getId(); }
}
