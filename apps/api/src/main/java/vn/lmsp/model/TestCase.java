package vn.lmsp.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "test_cases")
public class TestCase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @Column(nullable = false, columnDefinition = "MEDIUMTEXT") private String input;
    @Column(name = "expected_output", nullable = false, columnDefinition = "MEDIUMTEXT") private String expectedOutput;
    @Column(name = "is_public", nullable = false) private boolean publicCase;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal weight;
    @Column(nullable = false) private int position;
    protected TestCase() { }
    public TestCase(Question question, String input, String expectedOutput, boolean publicCase, BigDecimal weight, int position) {
        this.question = question; this.input = input; this.expectedOutput = expectedOutput;
        this.publicCase = publicCase; this.weight = weight; this.position = position;
    }
    public String getInput() { return input; }
    public String getExpectedOutput() { return expectedOutput; }
    public boolean isPublicCase() { return publicCase; }
    public BigDecimal getWeight() { return weight; }
    public int getPosition() { return position; }
}
