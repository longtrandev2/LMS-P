package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.LeaveRequestStatus;

/** Đơn xin nghỉ cho một buổi — docs/class-schedule-grades-spec.md §4. */
@Entity
@Table(name = "leave_requests")
@Getter
public class LeaveRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "class_id", nullable = false) private Long classId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "session_id", nullable = false) private ClassSession session;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false) private User student;
    @Column(nullable = false, columnDefinition = "TEXT") private String reason;
    @Column(name = "evidence_path", nullable = false, length = 500) private String evidencePath;
    @Column(name = "evidence_name", nullable = false, length = 255) private String evidenceName;
    @Column(name = "evidence_size", nullable = false) private int evidenceSize;
    @Column(name = "evidence_type", nullable = false, length = 100) private String evidenceType;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private LeaveRequestStatus status = LeaveRequestStatus.pending;
    @Column(name = "review_note", length = 500) private String reviewNote;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reviewed_by") private User reviewer;
    @Column(name = "reviewed_at") private LocalDateTime reviewedAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected LeaveRequest() { }

    public LeaveRequest(ClassSession session, User student, String reason, String evidencePath,
                        String evidenceName, int evidenceSize, String evidenceType) {
        this.classId = session.getClassId(); this.session = session; this.student = student; this.reason = reason;
        this.evidencePath = evidencePath; this.evidenceName = evidenceName;
        this.evidenceSize = evidenceSize; this.evidenceType = evidenceType;
    }

    @PrePersist void onCreate() { if (createdAt == null) createdAt = UtcTime.now(); }

    public Long getStudentId() { return student.getId(); }
    public Long getSessionId() { return session.getId(); }
    public boolean isPending() { return status == LeaveRequestStatus.pending; }

    public void review(LeaveRequestStatus decision, String note, User reviewer, LocalDateTime now) {
        this.status = decision; this.reviewNote = note; this.reviewer = reviewer; this.reviewedAt = now;
    }

    public void cancel() { this.status = LeaveRequestStatus.cancelled; }
}
