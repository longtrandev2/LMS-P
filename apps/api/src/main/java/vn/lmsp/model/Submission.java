package vn.lmsp.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "submissions", uniqueConstraints = {
        @UniqueConstraint(name = "uq_submission_attempt_question", columnNames = {"assignment_attempt_id", "question_id"}),
        @UniqueConstraint(name = "uq_assignment_question_attempt", columnNames = {"assignment_id", "student_id", "question_id", "attempt_no"}),
        @UniqueConstraint(name = "uq_submission_idempotency", columnNames = "idempotency_key")})
public class Submission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false) private User student;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_attempt_id") private AssignmentAttempt assignmentAttempt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_version_id", nullable = false) private QuestionVersion questionVersion;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SubmissionType type;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "selected_option_ids", columnDefinition = "json") private List<Long> selectedOptionIds;
    @Column(length = 20) private String language;
    @Column(name = "source_code", columnDefinition = "MEDIUMTEXT") private String sourceCode;
    @Column(name = "attempt_no", nullable = false) private int attemptNo;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SubmissionStatus status;
    @Column(precision = 8, scale = 2) private BigDecimal score;
    @Column(name = "is_late", nullable = false) private boolean late;
    @Column(name = "idempotency_key", columnDefinition = "char(36)") private String idempotencyKey;
    @Column(name = "submitted_at", nullable = false) private LocalDateTime submittedAt;
    protected Submission() { }
    public Submission(User student, Assignment assignment, AssignmentAttempt attempt, AssignmentQuestion link,
            List<Long> selected, int attemptNo, BigDecimal score, boolean late, String key, LocalDateTime submittedAt) {
        this.student = student; this.assignment = assignment; this.assignmentAttempt = attempt;
        this.question = link.getQuestion(); this.questionVersion = link.getQuestionVersion();
        this.type = SubmissionType.mcq; this.selectedOptionIds = selected; this.attemptNo = attemptNo;
        this.status = SubmissionStatus.completed; this.score = score; this.late = late;
        this.idempotencyKey = key; this.submittedAt = submittedAt;
    }
    public Long getId() { return id; }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getAssignmentAttemptId() { return assignmentAttempt == null ? null : assignmentAttempt.getId(); }
    public Long getStudentId() { return student.getId(); }
    public Long getQuestionId() { return question.getId(); }
    public int getAttemptNo() { return attemptNo; }
    public BigDecimal getScore() { return score; }
    public List<Long> getSelectedOptionIds() { return selectedOptionIds; }
    public boolean isLate() { return late; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
}
