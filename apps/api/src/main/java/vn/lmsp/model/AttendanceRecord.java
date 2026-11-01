package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import vn.lmsp.enums.AttendanceStatus;

/** Điểm danh một sinh viên trong một buổi — docs/class-schedule-grades-spec.md §3. */
@Entity
@Table(name = "attendance_records",
        uniqueConstraints = @UniqueConstraint(name = "uq_attendance_session_student", columnNames = {"session_id", "student_id"}))
@Getter
public class AttendanceRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "session_id", nullable = false) private ClassSession session;
    @Column(name = "student_id", nullable = false) private Long studentId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AttendanceStatus status;
    @Column(length = 255) private String note;
    @Column(name = "marked_by", nullable = false) private Long markedBy;
    @Column(name = "marked_at", nullable = false) private LocalDateTime markedAt;

    protected AttendanceRecord() { }

    public AttendanceRecord(ClassSession session, Long studentId, AttendanceStatus status, String note,
                            Long markedBy, LocalDateTime now) {
        this.session = session; this.studentId = studentId;
        mark(status, note, markedBy, now);
    }

    public void mark(AttendanceStatus status, String note, Long markedBy, LocalDateTime now) {
        this.status = status; this.note = note; this.markedBy = markedBy; this.markedAt = now;
    }

    public boolean attended() { return status == AttendanceStatus.present || status == AttendanceStatus.late; }
}
