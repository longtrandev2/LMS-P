package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.AnnouncementAudience;

/** Thông báo hệ thống admin đã gửi — docs/admin-spec.md §5.1. */
@Entity
@Table(name = "announcements")
@Getter
public class Announcement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "audience", nullable = false, length = 10) private String audienceValue;
    @Column(length = 20) private String role;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_id") private LmsClass lmsClass;
    @Column(name = "recipient_count", nullable = false) private int recipientCount;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected Announcement() { }
    public Announcement(String title, String body, AnnouncementAudience audience, String role, LmsClass lmsClass,
                        int recipientCount, User creator) {
        this.title = title; this.body = body; this.audienceValue = audience.value(); this.role = role;
        this.lmsClass = lmsClass; this.recipientCount = recipientCount; this.creator = creator;
    }
    @PrePersist void onCreate() { createdAt = UtcTime.now(); }
    public AnnouncementAudience getAudience() { return AnnouncementAudience.fromValue(audienceValue); }
    public Long getClassId() { return lmsClass == null ? null : lmsClass.getId(); }
}
