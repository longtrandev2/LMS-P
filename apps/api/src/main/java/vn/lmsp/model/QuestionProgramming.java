package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;

@Entity
@Table(name = "question_programming")
@Getter
public class QuestionProgramming {
    @Id @Column(name = "question_id") private Long questionId;
    @MapsId @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id") private Question question;
    @Column(name = "starter_code", columnDefinition = "TEXT") private String starterCode;
    @Column(name = "solution_code", columnDefinition = "MEDIUMTEXT") private String solutionCode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_languages", columnDefinition = "json") private List<String> allowedLanguages;
    @Column(name = "time_limit_ms", nullable = false) private int timeLimitMs;
    @Column(name = "memory_limit_mb", nullable = false) private int memoryLimitMb;
    protected QuestionProgramming() { }
    public QuestionProgramming(Question question, String starterCode, String solutionCode, List<String> languages, int timeLimitMs, int memoryLimitMb) {
        this.question = question; this.starterCode = starterCode; this.solutionCode = solutionCode;
        this.allowedLanguages = languages; this.timeLimitMs = timeLimitMs; this.memoryLimitMb = memoryLimitMb;
    }
    public void update(String starterCode, String solutionCode, List<String> languages, int timeLimitMs, int memoryLimitMb) {
        this.starterCode = starterCode; this.solutionCode = solutionCode; this.allowedLanguages = languages;
        this.timeLimitMs = timeLimitMs; this.memoryLimitMb = memoryLimitMb;
    }
}
