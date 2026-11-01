package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.lmsp.dto.RunDtos.RunPayload;
import vn.lmsp.dto.RunJobResult;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.RunJobKind;

/** Job chạy thử / kiểm tra đề, đồng thời là outbox — docs/database-design.md §2.7 `run_jobs`. */
@Entity
@Table(name = "run_jobs", uniqueConstraints = @UniqueConstraint(name = "uq_run_job_uuid", columnNames = "job_id"))
@Getter
public class RunJob {
    public static final String PENDING = "pending", RUNNING = "running", COMPLETED = "completed", FAILED = "failed";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "job_id", nullable = false, columnDefinition = "char(36)") private String jobId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RunJobKind kind;
    @Column(name = "requested_by", nullable = false) private Long requestedBy;
    @Column(name = "question_id") private Long questionId;
    @Column(name = "question_version_id") private Long questionVersionId;
    @Column(name = "assignment_id") private Long assignmentId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "json") private RunPayload payload;
    @Column(nullable = false, length = 16) private String status;
    @Enumerated(EnumType.STRING) @Column(length = 16) private GradingVerdict verdict;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") private RunJobResult result;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "next_attempt_at", nullable = false) private LocalDateTime nextAttemptAt;
    @Column(name = "published_at") private LocalDateTime publishedAt;
    @Column(name = "publish_attempts", nullable = false) private int publishAttempts;
    @Column(name = "completed_at") private LocalDateTime completedAt;

    protected RunJob() { }
    public RunJob(RunJobKind kind, Long requestedBy, Long questionId, Long questionVersionId, Long assignmentId,
            RunPayload payload, LocalDateTime now) {
        this.jobId = UUID.randomUUID().toString();
        this.kind = kind; this.requestedBy = requestedBy; this.questionId = questionId;
        this.questionVersionId = questionVersionId; this.assignmentId = assignmentId; this.payload = payload;
        this.status = PENDING; this.createdAt = now; this.nextAttemptAt = now;
    }

    public boolean isTerminal() { return COMPLETED.equals(status) || FAILED.equals(status); }
    public void start() { status = RUNNING; }
    public void finish(String status, GradingVerdict verdict, RunJobResult result, LocalDateTime now) {
        this.status = status; this.verdict = verdict; this.result = result; this.completedAt = now;
    }
    public void published(LocalDateTime now) { publishedAt = now; }
    public void retryLater(LocalDateTime now) {
        publishAttempts++;
        nextAttemptAt = now.plusSeconds(Math.min(60, 1L << Math.min(publishAttempts, 6)));
    }
}
