package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import vn.lmsp.common.Utf8Text;

@Entity
@Table(name = "grading_results", uniqueConstraints = {
        @UniqueConstraint(name = "uq_grading_result_job", columnNames = "grading_job_id"),
        @UniqueConstraint(name = "uq_grading_result_attempt", columnNames = {"submission_id", "attempt_no"})})
@Getter
public class GradingResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "submission_id", nullable = false) private Submission submission;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "grading_job_id", nullable = false) private GradingJob job;
    @Column(name = "attempt_no", nullable = false) private int attemptNo;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "total_score", precision = 8, scale = 2) private BigDecimal totalScore;
    @Column(name = "compile_error", nullable = false) private boolean compileError;
    @Column(name = "compile_output", columnDefinition = "MEDIUMTEXT") private String compileOutput;
    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "graded_at", nullable = false) private LocalDateTime gradedAt;
    @Column(name = "duration_ms", nullable = false) private int durationMs;

    protected GradingResult() { }
    public GradingResult(GradingJob job, BigDecimal score, boolean failed, boolean compileError,
            String compileOutput, String errorMessage, int durationMs, LocalDateTime now) {
        this.job = job;
        this.submission = job.getSubmission();
        this.attemptNo = job.getAttemptNo();
        this.status = failed ? "failed" : "graded";
        this.totalScore = score;
        this.compileError = compileError;
        this.compileOutput = Utf8Text.truncate(compileOutput, 65536);
        this.errorMessage = Utf8Text.truncate(errorMessage, 8192);
        this.gradedAt = now;
        this.durationMs = durationMs;
    }
}
