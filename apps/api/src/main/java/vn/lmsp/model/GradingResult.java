package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import vn.lmsp.common.Utf8Text;
import vn.lmsp.enums.GradingVerdict;

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
    @Enumerated(EnumType.STRING) @Column(length = 16) private GradingVerdict verdict;
    @Column(name = "total_score", precision = 8, scale = 2) private BigDecimal totalScore;
    @Column(name = "compile_error", nullable = false) private boolean compileError;
    @Column(name = "compile_output", columnDefinition = "MEDIUMTEXT") private String compileOutput;
    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "graded_at", nullable = false) private LocalDateTime gradedAt;
    @Column(name = "duration_ms", nullable = false) private int durationMs;
    @Column(name = "tests_total") private Integer testsTotal;
    @Column(name = "tests_passed") private Integer testsPassed;
    @Column(name = "failed_test") private Integer failedTest;

    protected GradingResult() { }
    public GradingResult(GradingJob job, GradingVerdict verdict, boolean failed, boolean compileError,
            String compileOutput, String errorMessage, int durationMs, LocalDateTime now) {
        this.job = job;
        this.submission = job.getSubmission();
        this.attemptNo = job.getAttemptNo();
        this.status = failed ? "failed" : "graded";
        this.verdict = verdict;
        this.totalScore = null;
        this.compileError = compileError;
        this.compileOutput = Utf8Text.truncate(compileOutput, 65536);
        this.errorMessage = Utf8Text.truncate(errorMessage, 8192);
        this.gradedAt = now;
        this.durationMs = durationMs;
    }
    /** Tóm tắt test (event v4); event v3 không có nên để NULL. */
    public void summarizeTests(Integer total, Integer passed, Integer failedPosition) {
        this.testsTotal = total; this.testsPassed = passed; this.failedTest = failedPosition;
    }
}
