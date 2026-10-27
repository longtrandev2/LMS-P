package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SubmitReason;

/**
 * Phiên làm bài có giờ kết thúc — docs/exam-spec.md §5. Chuyển `in_progress → submitted` phải qua câu lệnh có điều kiện
 * ở repository ({@code claimSubmit}) để không nộp hai lần; {@link #markSubmitted} chỉ đồng bộ entity sau khi đã claim.
 */
@Entity
@Table(name = "attempt_sessions", uniqueConstraints = @UniqueConstraint(name = "uq_attempt_session_no", columnNames = {"assignment_id", "student_id", "attempt_no"}))
@Getter
public class AttemptSession {
    /** Ân hạn sau `ends_at` cho độ trễ mạng — exam-spec.md §4. */
    public static final int GRACE_SECONDS = 5;

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false) private User student;
    @Column(name = "attempt_no", nullable = false) private int attemptNo;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "paper_id", nullable = false) private AssessmentPaper paper;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AttemptSessionStatus status = AttemptSessionStatus.in_progress;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "question_order", nullable = false, columnDefinition = "json") private List<Long> questionOrder;
    @Column(name = "started_at", nullable = false) private LocalDateTime startedAt;
    @Column(name = "ends_at", nullable = false) private LocalDateTime endsAt;
    @Column(name = "extra_minutes", nullable = false) private int extraMinutes;
    @Column(name = "rules_accepted_at") private LocalDateTime rulesAcceptedAt;
    @Column(name = "last_seen_at", nullable = false) private LocalDateTime lastSeenAt;
    @Column(name = "focus_lost_count", nullable = false) private int focusLostCount;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Enumerated(EnumType.STRING) @Column(name = "submit_reason", length = 10) private SubmitReason submitReason;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_attempt_id") private AssignmentAttempt assignmentAttempt;

    protected AttemptSession() { }
    public AttemptSession(Assignment assignment, User student, int attemptNo, AssessmentPaper paper, List<Long> questionOrder,
                          LocalDateTime startedAt, LocalDateTime endsAt, LocalDateTime rulesAcceptedAt) {
        this.assignment = assignment; this.student = student; this.attemptNo = attemptNo; this.paper = paper;
        this.questionOrder = List.copyOf(questionOrder); this.startedAt = startedAt; this.endsAt = endsAt;
        this.rulesAcceptedAt = rulesAcceptedAt; this.lastSeenAt = startedAt;
    }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getStudentId() { return student.getId(); }
    public Long getPaperId() { return paper.getId(); }
    public Long getAssignmentAttemptId() { return assignmentAttempt == null ? null : assignmentAttempt.getId(); }
    public boolean isInProgress() { return status == AttemptSessionStatus.in_progress; }
    /** Còn nhận lưu/nộp: đang làm và chưa quá `ends_at` + ân hạn. */
    public boolean acceptsWrites(LocalDateTime now) { return isInProgress() && !now.isAfter(endsAt.plusSeconds(GRACE_SECONDS)); }
    public long remainingSeconds(LocalDateTime now) {
        return isInProgress() ? Math.max(0, Duration.between(now, endsAt).getSeconds()) : 0;
    }
    public void touch(LocalDateTime now) { if (now.isAfter(lastSeenAt)) lastSeenAt = now; }
    public void focusLost() { focusLostCount++; }
    public void extend(int minutes) { extraMinutes += minutes; endsAt = endsAt.plusMinutes(minutes); }
    /** Gọi sau khi `claimSubmit` đã đổi trạng thái trong DB, để đồng bộ entity trong cùng giao dịch. */
    public void markSubmitted(SubmitReason reason, LocalDateTime now, AssignmentAttempt attempt) {
        status = AttemptSessionStatus.submitted; submitReason = reason; submittedAt = now; assignmentAttempt = attempt;
    }
}
