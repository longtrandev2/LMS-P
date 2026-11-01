package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_attempts", uniqueConstraints = {
        @UniqueConstraint(name = "uq_assignment_attempt_no", columnNames = {"assignment_id", "student_id", "attempt_no"}),
        @UniqueConstraint(name = "uq_assignment_attempt_key", columnNames = "idempotency_key")})
@Getter
public class AssignmentAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false) private User student;
    @Column(name = "attempt_no", nullable = false) private int attemptNo;
    @Column(name = "is_late", nullable = false) private boolean late;
    @Column(name = "late_penalty_percent", nullable = false) private int latePenaltyPercent;
    @Column(nullable = false, precision = 8, scale = 2) private BigDecimal score;
    @Column(name = "idempotency_key", nullable = false, columnDefinition = "char(36)") private String idempotencyKey;
    @Column(name = "submitted_at", nullable = false) private LocalDateTime submittedAt;
    protected AssignmentAttempt() { }
    public AssignmentAttempt(Assignment assignment, User student, int attemptNo, boolean late, int penalty,
                            BigDecimal score, String idempotencyKey, LocalDateTime submittedAt) {
        this.assignment = assignment; this.student = student; this.attemptNo = attemptNo; this.late = late;
        this.latePenaltyPercent = penalty; this.score = score; this.idempotencyKey = idempotencyKey; this.submittedAt = submittedAt;
    }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getStudentId() { return student.getId(); }
    /** Lượt giao theo phiên: tính lại khi bài code của lượt chấm xong — docs/exam-spec.md §5.6. */
    public void updateScore(BigDecimal value) { score = value; }
}
