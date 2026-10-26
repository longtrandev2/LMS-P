package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.ScorePolicy;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Getter
public class Assignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_id", nullable = false) private LmsClass lmsClass;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Convert(converter = AssignmentCategoryConverter.class) @Column(nullable = false, length = 20) private AssignmentCategory category;
    @Column(name = "available_from") private LocalDateTime availableFrom;
    @Column(name = "due_at", nullable = false) private LocalDateTime dueAt;
    @Column(name = "allow_late", nullable = false) private boolean allowLate;
    @Column(name = "late_due_at") private LocalDateTime lateDueAt;
    @Column(name = "late_penalty_percent", nullable = false) private int latePenaltyPercent;
    @Column(name = "max_attempts") private Integer maxAttempts;
    @Enumerated(EnumType.STRING) @Column(name = "score_policy", nullable = false) private ScorePolicy scorePolicy;
    @Column(name = "is_published", nullable = false) private boolean published;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    protected Assignment() { }
    public Assignment(LmsClass clazz, String title, String description, AssignmentCategory category,
            LocalDateTime availableFrom, LocalDateTime dueAt, boolean allowLate, LocalDateTime lateDueAt,
            int latePenaltyPercent, Integer maxAttempts, ScorePolicy scorePolicy, User creator) {
        this.lmsClass = clazz; this.title = title; this.description = description; this.category = category;
        this.availableFrom = availableFrom; this.dueAt = dueAt; this.allowLate = allowLate; this.lateDueAt = lateDueAt;
        this.latePenaltyPercent = latePenaltyPercent; this.maxAttempts = maxAttempts; this.scorePolicy = scorePolicy; this.creator = creator;
    }
    @PrePersist void onCreate() { createdAt = UtcTime.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = UtcTime.now(); }
    public Long getClassId() { return lmsClass.getId(); }
    public Long getLecturerId() { return lmsClass.getLecturerId(); }
    public void update(String title, String description, AssignmentCategory category, LocalDateTime availableFrom,
            LocalDateTime dueAt, boolean allowLate, LocalDateTime lateDueAt, int penalty, Integer maxAttempts, ScorePolicy policy) {
        this.title = title; this.description = description; this.category = category; this.availableFrom = availableFrom;
        this.dueAt = dueAt; this.allowLate = allowLate; this.lateDueAt = lateDueAt; this.latePenaltyPercent = penalty;
        this.maxAttempts = maxAttempts; this.scorePolicy = policy;
    }
    public void updatePublishedSettings(String title, String description, LocalDateTime availableFrom,
            LocalDateTime dueAt, boolean allowLate, LocalDateTime lateDueAt, int penalty) {
        if (!published) throw new IllegalStateException("Assignment must be published");
        this.title = title; this.description = description; this.availableFrom = availableFrom; this.dueAt = dueAt;
        this.allowLate = allowLate; this.lateDueAt = lateDueAt; this.latePenaltyPercent = penalty;
    }
    public void publish() { published = true; }
}
