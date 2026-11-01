package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.common.SessionClock;

/** Buổi học của lớp — docs/class-schedule-grades-spec.md §2, database-design.md §2.10. */
@Entity
@Table(name = "class_sessions")
@Getter
public class ClassSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_id", nullable = false) private LmsClass lmsClass;
    @Column(name = "session_no", nullable = false) private int sessionNo;
    @Column(name = "session_date", nullable = false) private LocalDate sessionDate;
    @Column(name = "start_period", nullable = false, columnDefinition = "tinyint unsigned") private int startPeriod;
    @Column(name = "end_period", nullable = false, columnDefinition = "tinyint unsigned") private int endPeriod;
    @Column(name = "starts_at", nullable = false) private LocalDateTime startsAt;
    @Column(name = "ends_at", nullable = false) private LocalDateTime endsAt;
    @Column(length = 50) private String room;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SessionMode mode = SessionMode.in_person;
    @Column(length = 200) private String title;
    @Column(columnDefinition = "TEXT") private String note;
    @Column(name = "is_cancelled", nullable = false) private boolean cancelled;
    @Column(name = "attendance_taken_at") private LocalDateTime attendanceTakenAt;
    @Column(name = "upcoming_notified_at") private LocalDateTime upcomingNotifiedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    protected ClassSession() { }

    public ClassSession(LmsClass lmsClass, int sessionNo, LocalDate date, int startPeriod, int endPeriod,
                        String room, SessionMode mode, String title, String note, User creator) {
        this.lmsClass = lmsClass; this.sessionNo = sessionNo; this.creator = creator;
        reschedule(date, startPeriod, endPeriod);
        updateDetails(room, mode, title, note);
    }

    @PrePersist void onCreate() { createdAt = UtcTime.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = UtcTime.now(); }

    public Long getClassId() { return lmsClass.getId(); }

    /** Đổi ngày/tiết; thời điểm UTC tính lại và thông báo "sắp diễn ra" được phép gửi lại. */
    public void reschedule(LocalDate date, int startPeriod, int endPeriod) {
        boolean changed = !date.equals(sessionDate) || startPeriod != this.startPeriod || endPeriod != this.endPeriod;
        this.sessionDate = date; this.startPeriod = startPeriod; this.endPeriod = endPeriod;
        this.startsAt = SessionClock.startsAt(date, startPeriod);
        this.endsAt = SessionClock.endsAt(date, endPeriod);
        if (changed) this.upcomingNotifiedAt = null;
    }

    public void updateDetails(String room, SessionMode mode, String title, String note) {
        this.room = room; this.mode = mode == null ? SessionMode.in_person : mode; this.title = title; this.note = note;
    }

    public void setCancelled(boolean cancelled) { this.cancelled = cancelled; }
    public void assignNumber(int sessionNo) { this.sessionNo = sessionNo; }
    public void markAttendanceTaken(LocalDateTime now) { if (attendanceTakenAt == null) attendanceTakenAt = now; }

    /** Hai buổi cùng ngày có tiết giao nhau. */
    public boolean overlaps(LocalDate date, int start, int end) {
        return sessionDate.equals(date) && start <= endPeriod && startPeriod <= end;
    }
}
