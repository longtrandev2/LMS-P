package vn.lmsp.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import vn.lmsp.common.Utf8Text;
import vn.lmsp.enums.TestResultStatus;

@Entity
@Table(name = "test_results", uniqueConstraints = @UniqueConstraint(
        name = "uq_test_result_position", columnNames = {"grading_result_id", "test_case_position"}))
public class TestResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "grading_result_id", nullable = false) private GradingResult result;
    @Column(name = "test_case_position", nullable = false) private int position;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private TestResultStatus status;
    @Column(columnDefinition = "MEDIUMTEXT") private String output;
    @Column(name = "time_ms", nullable = false) private int timeMs;
    @Column(name = "memory_kb") private Integer memoryKb;
    @Column(nullable = false, precision = 8, scale = 2) private BigDecimal score;

    protected TestResult() { }
    public TestResult(GradingResult result, int position, TestResultStatus status, String output,
            int timeMs, Integer memoryKb, BigDecimal score) {
        this.result = result;
        this.position = position;
        this.status = status;
        this.output = Utf8Text.truncate(output, 65536);
        this.timeMs = timeMs;
        this.memoryKb = memoryKb;
        this.score = score;
    }
    public int getPosition() { return position; }
    public TestResultStatus getStatus() { return status; }
    public String getOutput() { return output; }
    public int getTimeMs() { return timeMs; }
    public Integer getMemoryKb() { return memoryKb; }
    public BigDecimal getScore() { return score; }
}
