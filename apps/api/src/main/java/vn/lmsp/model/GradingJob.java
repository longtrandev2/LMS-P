package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "grading_jobs", uniqueConstraints = {
        @UniqueConstraint(name = "uq_grading_job_uuid", columnNames = "job_id"),
        @UniqueConstraint(name = "uq_grading_job_attempt", columnNames = {"submission_id", "attempt_no"})})
public class GradingJob {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "job_id", nullable = false, columnDefinition = "char(36)") private String jobId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "submission_id", nullable = false) private Submission submission;
    @Column(name = "attempt_no", nullable = false) private int attemptNo;
    @Column(nullable = false) private int priority;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "next_attempt_at", nullable = false) private LocalDateTime nextAttemptAt;
    @Column(name = "published_at") private LocalDateTime publishedAt;
    @Column(name = "publish_attempts", nullable = false) private int publishAttempts;

    protected GradingJob() { }
    public GradingJob(Submission submission, int priority, LocalDateTime now) {
        this.jobId = UUID.randomUUID().toString();
        this.submission = submission;
        this.priority = priority;
        this.attemptNo = 1;
        this.createdAt = now;
        this.nextAttemptAt = now;
    }
    public Long getId() { return id; }
    public String getJobId() { return jobId; }
    public Submission getSubmission() { return submission; }
    public int getAttemptNo() { return attemptNo; }
    public int getPriority() { return priority; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void published(LocalDateTime now) { publishedAt = now; }
    public void retryLater(LocalDateTime now) {
        publishAttempts++;
        nextAttemptAt = now.plusSeconds(Math.min(60, 1L << Math.min(publishAttempts, 6)));
    }
}
