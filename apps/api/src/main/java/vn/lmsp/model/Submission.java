package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.enums.GradingVerdict;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "submissions", uniqueConstraints = {
        @UniqueConstraint(name = "uq_submission_attempt_question", columnNames = {"assignment_attempt_id", "question_id"}),
        @UniqueConstraint(name = "uq_assignment_question_attempt", columnNames = {"assignment_id", "student_id", "question_id", "attempt_no"}),
        @UniqueConstraint(name = "uq_submission_idempotency", columnNames = "idempotency_key")})
@Getter
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
    @Enumerated(EnumType.STRING) @Column(length = 16) private GradingVerdict verdict;
    @Column(precision = 8, scale = 2) private BigDecimal score;
    @Column(name = "is_late", nullable = false) private boolean late;
    @Column(name = "idempotency_key", columnDefinition = "char(36)") private String idempotencyKey;
    @Column(name = "submitted_at", nullable = false) private LocalDateTime submittedAt;
    @Column(name = "max_score", nullable = false, precision = 6, scale = 2) private BigDecimal maxScore;
    @Column(name = "late_penalty_percent", nullable = false) private int latePenaltyPercent;
    protected Submission() { }
    public Submission(User student, Assignment assignment, AssignmentAttempt attempt, AssignmentQuestion link,
            List<Long> selected, int attemptNo, BigDecimal score, boolean late, String key, LocalDateTime submittedAt) {
        this.student = student; this.assignment = assignment; this.assignmentAttempt = attempt;
        this.question = link.getQuestion(); this.questionVersion = link.getQuestionVersion();
        this.type = SubmissionType.mcq; this.selectedOptionIds = selected; this.attemptNo = attemptNo;
        this.status = SubmissionStatus.completed; this.score = score; this.late = late;
        this.idempotencyKey = key; this.submittedAt = submittedAt;
        this.maxScore = link.getPoints(); this.latePenaltyPercent = late ? assignment.getLatePenaltyPercent() : 0;
    }
    public static Submission programming(User student, Assignment assignment, AssignmentQuestion link, int attemptNo,
            String language, String sourceCode, boolean late, int penalty, String key, LocalDateTime now) {
        Submission item = new Submission();
        item.student = student; item.assignment = assignment; item.question = link.getQuestion();
        item.questionVersion = link.getQuestionVersion(); item.type = SubmissionType.code;
        item.attemptNo = attemptNo; item.language = language; item.sourceCode = sourceCode;
        item.status = SubmissionStatus.pending; item.late = late; item.latePenaltyPercent = penalty;
        item.maxScore = link.getPoints(); item.idempotencyKey = key; item.submittedAt = now;
        return item;
    }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getAssignmentAttemptId() { return assignmentAttempt == null ? null : assignmentAttempt.getId(); }
    public Long getStudentId() { return student.getId(); }
    public String getStudentFullName() { return student.getFullName(); }
    public String getStudentCode() { return student.getStudentCode(); }
    public Long getQuestionId() { return question.getId(); }
    public boolean isTerminal() { return status == SubmissionStatus.completed || status == SubmissionStatus.failed; }
    public void startGrading() { if (status == SubmissionStatus.pending) status = SubmissionStatus.grading; }
    public void finish(SubmissionStatus status, GradingVerdict verdict) {
        this.status = status;
        this.verdict = verdict;
        this.score = null;
    }
}
