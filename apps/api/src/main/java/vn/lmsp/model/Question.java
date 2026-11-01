package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "questions")
@Getter
public class Question {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "owner_id", nullable = false) private User owner;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id", nullable = false) private QuestionCategory category;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private QuestionType type;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(columnDefinition = "TEXT") private String explanation;
    @Enumerated(EnumType.STRING) @Column(name = "scoring_mode", nullable = false, length = 20)
    private ScoringMode scoringMode = ScoringMode.all_or_nothing;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "answer_spec", columnDefinition = "json") private AnswerSpec answerSpec;
    @Column(length = 100) private String topic;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private QuestionDifficulty difficulty;
    @Column(name = "is_deleted", nullable = false) private boolean deleted;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    protected Question() { }
    public Question(User owner, QuestionCategory category, QuestionType type, String content, String topic, QuestionDifficulty difficulty) {
        this.owner = owner; this.category = category; this.type = type; this.content = content; this.topic = topic; this.difficulty = difficulty;
    }
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
    public Long getOwnerId() { return owner.getId(); }
    public Long getCategoryId() { return category.getId(); }
    public Long getBankId() { return category.getBankId(); }
    public Long getCourseId() { return category.getBank().getCourseId(); }
    public String getCategoryName() { return category.getName(); }
    public String getBankName() { return category.getBank().getName(); }
    public void update(String content, String topic, QuestionDifficulty difficulty, QuestionCategory category) {
        this.content = content; this.topic = topic; this.difficulty = difficulty; this.category = category;
    }
    /** Phần đáp án/chấm đã được QuestionContentValidator chuẩn hóa. */
    public void updateAnswer(String explanation, ScoringMode scoringMode, AnswerSpec answerSpec) {
        this.explanation = explanation; this.scoringMode = scoringMode; this.answerSpec = answerSpec;
    }
    public void touch() { updatedAt = LocalDateTime.now(); }
    public void softDelete() { deleted = true; }
}
