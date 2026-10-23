package vn.lmsp.model;

import jakarta.persistence.*;
import vn.lmsp.enums.EnrollmentStatus;
import java.time.LocalDateTime;

@Entity
@Table(name = "enrollments", uniqueConstraints = @UniqueConstraint(name = "uq_enrollments_class_student", columnNames = {"class_id", "student_id"}))
public class Enrollment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "class_id", nullable = false) private LmsClass lmsClass;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false) private User student;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private EnrollmentStatus status = EnrollmentStatus.active;
    @Column(name = "enrolled_at", nullable = false) private LocalDateTime enrolledAt;
    protected Enrollment() { }
    public Enrollment(LmsClass lmsClass, User student) { this.lmsClass = lmsClass; this.student = student; }
    @PrePersist void createTimestamp() { enrolledAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public LmsClass getLmsClass() { return lmsClass; }
    public User getStudent() { return student; }
    public EnrollmentStatus getStatus() { return status; }
    public LocalDateTime getEnrolledAt() { return enrolledAt; }
    public void reactivate() { status = EnrollmentStatus.active; enrolledAt = LocalDateTime.now(); }
    public void drop() { status = EnrollmentStatus.dropped; }
}
