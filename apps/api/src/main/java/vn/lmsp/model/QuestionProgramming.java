package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "question_programming")
@Getter
public class QuestionProgramming {
    @Id @Column(name = "question_id") private Long questionId;
    @MapsId @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id") private Question question;
    /** Trường cũ (một starter code chung), chỉ đọc tương thích. Bản mới dùng `starterCodes`. */
    @Column(name = "starter_code", columnDefinition = "TEXT") private String starterCode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "starter_codes", columnDefinition = "json") private Map<String, String> starterCodes;
    @Column(name = "solution_code", columnDefinition = "MEDIUMTEXT") private String solutionCode;
    @Column(name = "solution_language", length = 10) private String solutionLanguage;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_languages", columnDefinition = "json") private List<String> allowedLanguages;
    @Column(name = "time_limit_ms", nullable = false) private int timeLimitMs;
    @Column(name = "memory_limit_mb", nullable = false) private int memoryLimitMb;
    @Column(name = "checker_mode", nullable = false, length = 10) private String checkerMode = "token";
    @Column(name = "checker_epsilon") private Double checkerEpsilon;
    protected QuestionProgramming() { }
    public QuestionProgramming(Question question, String starterCode, String solutionCode, List<String> languages, int timeLimitMs, int memoryLimitMb) {
        this.question = question; this.starterCode = starterCode; this.solutionCode = solutionCode;
        this.allowedLanguages = languages; this.timeLimitMs = timeLimitMs; this.memoryLimitMb = memoryLimitMb;
    }
    public void update(Map<String, String> starterCodes, String starterCode, String solutionCode, String solutionLanguage,
            List<String> languages, int timeLimitMs, int memoryLimitMb, String checkerMode, Double checkerEpsilon) {
        this.starterCodes = starterCodes; this.starterCode = starterCode;
        this.solutionCode = solutionCode; this.solutionLanguage = solutionLanguage; this.allowedLanguages = languages;
        this.timeLimitMs = timeLimitMs; this.memoryLimitMb = memoryLimitMb;
        this.checkerMode = checkerMode; this.checkerEpsilon = checkerEpsilon;
    }
}
