package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.enums.ScorePolicy;
import java.security.SecureRandom;
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
    @Enumerated(EnumType.STRING) @Column(name = "review_mode", nullable = false, length = 20) private ReviewMode reviewMode = ReviewMode.after_close;
    @Column(name = "review_shows_answers", nullable = false) private boolean reviewShowsAnswers = true;
    @Column(name = "shuffle_questions", nullable = false) private boolean shuffleQuestions;
    @Column(name = "shuffle_options", nullable = false) private boolean shuffleOptions;
    @Column(name = "time_limit_minutes") private Integer timeLimitMinutes;
    @Enumerated(EnumType.STRING) @Column(name = "paper_mode", nullable = false, length = 20) private PaperMode paperMode = PaperMode.same;
    @Column(name = "variant_count") private Integer variantCount;
    @Column(name = "rules_text", columnDefinition = "TEXT") private String rulesText;
    @Column(name = "paper_seed", nullable = false) private long paperSeed = new SecureRandom().nextLong();
    @Column(name = "is_published", nullable = false) private boolean published;
    @Column(name = "upcoming_notified_at") private LocalDateTime upcomingNotifiedAt;
    @Column(name = "results_notified_at") private LocalDateTime resultsNotifiedAt;
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
    /** Chính sách xem lại và trộn đề — docs/assessment-spec.md §6. Chỉ gọi khi còn nháp. */
    public void configureReview(ReviewMode mode, boolean showsAnswers, boolean shuffleQuestions, boolean shuffleOptions) {
        if (published) throw new IllegalStateException("Assignment is already published");
        this.reviewMode = mode; this.reviewShowsAnswers = showsAnswers;
        this.shuffleQuestions = shuffleQuestions; this.shuffleOptions = shuffleOptions;
    }
    public void updatePublishedSettings(String title, String description, LocalDateTime availableFrom,
            LocalDateTime dueAt, boolean allowLate, LocalDateTime lateDueAt, int penalty,
            ReviewMode reviewMode, boolean reviewShowsAnswers) {
        if (!published) throw new IllegalStateException("Assignment must be published");
        this.title = title; this.description = description; this.availableFrom = availableFrom; this.dueAt = dueAt;
        this.allowLate = allowLate; this.lateDueAt = lateDueAt; this.latePenaltyPercent = penalty;
        this.reviewMode = reviewMode; this.reviewShowsAnswers = reviewShowsAnswers;
    }
    /** "Đóng" = hạn nộp muộn nếu cho nộp muộn, ngược lại hạn chính thức. */
    public LocalDateTime getClosesAt() { return allowLate && lateDueAt != null ? lateDueAt : dueAt; }
    public void publish() { published = true; }

    /** Kỳ thi — docs/exam-spec.md §1. */
    public boolean isExam() { return category == AssignmentCategory.MIDTERM || category == AssignmentCategory.FINAL; }
    /** Giao theo phiên: kỳ thi, hoặc quiz có giới hạn giờ / không dùng một đề chung — exam-spec.md §1. */
    public boolean isSessionBased() {
        return isExam() || category == AssignmentCategory.QUIZ && (timeLimitMinutes != null || paperMode != PaperMode.same);
    }
    /** Thời gian và cách giao đề — exam-spec.md §2. Chỉ gọi khi còn nháp; caller đã kiểm tra ràng buộc theo hạng mục. */
    public void configureDelivery(Integer timeLimitMinutes, PaperMode paperMode, Integer variantCount, String rulesText) {
        if (published) throw new IllegalStateException("Assignment is already published");
        this.timeLimitMinutes = timeLimitMinutes; this.paperMode = paperMode == null ? PaperMode.same : paperMode;
        this.variantCount = variantCount; this.rulesText = rulesText;
    }
    /** Quy chế được sửa cả sau xuất bản (published-settings). */
    public void updateRulesText(String rulesText) { this.rulesText = rulesText; }
    /** Đánh dấu đã gửi `exam.upcoming` / `grade.released` — docs/admin-spec.md §8. */
    public void markUpcomingNotified(LocalDateTime now) { upcomingNotifiedAt = now; }
    public void markResultsNotified(LocalDateTime now) { resultsNotifiedAt = now; }
    /** "Bốc lại" đề nháp — exam-spec.md §3.5. */
    public void reseed(long seed) {
        if (published) throw new IllegalStateException("Assignment is already published");
        paperSeed = seed;
    }
}
