package vn.lmsp.model;

import jakarta.persistence.*;
import vn.lmsp.enums.SessionDelivery;
import vn.lmsp.enums.SessionMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Một buổi học của lớp (FR-CRS-05): ngày + tiết (quy đổi giờ ở ClassPeriods), có thể đè room của lớp. */
@Entity
@Table(name = "class_sessions")
public class ClassSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_id", nullable = false) private LmsClass lmsClass;
    @Column(name = "session_date", nullable = false) private LocalDate sessionDate;
    @Column(name = "period_start", nullable = false) private int periodStart;
    @Column(name = "period_end", nullable = false) private int periodEnd;
    @Column(name = "start_time", nullable = false) private LocalTime startTime;
    @Column(name = "end_time", nullable = false) private LocalTime endTime;
    @Column(length = 50) private String room;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SessionMode mode = SessionMode.ly_thuyet;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SessionDelivery delivery = SessionDelivery.truc_tiep;
    @Column(length = 200) private String title;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected ClassSession() { }
    public ClassSession(LmsClass lmsClass, LocalDate sessionDate, int periodStart, int periodEnd,
                        LocalTime startTime, LocalTime endTime, String room, SessionMode mode,
                        SessionDelivery delivery, String title) {
        this.lmsClass = lmsClass; this.sessionDate = sessionDate; this.periodStart = periodStart; this.periodEnd = periodEnd;
        this.startTime = startTime; this.endTime = endTime; this.room = room;
        this.mode = mode == null ? SessionMode.ly_thuyet : mode;
        this.delivery = delivery == null ? SessionDelivery.truc_tiep : delivery;
        this.title = title;
    }
    @PrePersist void createTimestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getClassId() { return lmsClass.getId(); }
    public LmsClass getLmsClass() { return lmsClass; }
    public LocalDate getSessionDate() { return sessionDate; }
    public int getPeriodStart() { return periodStart; }
    public int getPeriodEnd() { return periodEnd; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getRoom() { return room; }
    public SessionMode getMode() { return mode; }
    public SessionDelivery getDelivery() { return delivery; }
    public String getTitle() { return title; }
    public void update(LocalDate sessionDate, int periodStart, int periodEnd, LocalTime startTime, LocalTime endTime,
                       String room, SessionMode mode, SessionDelivery delivery, String title) {
        if (sessionDate != null) this.sessionDate = sessionDate;
        if (periodStart > 0) this.periodStart = periodStart;
        if (periodEnd > 0) this.periodEnd = periodEnd;
        if (startTime != null) this.startTime = startTime;
        if (endTime != null) this.endTime = endTime;
        if (room != null) this.room = room;
        if (mode != null) this.mode = mode;
        if (delivery != null) this.delivery = delivery;
        if (title != null) this.title = title;
    }
}
