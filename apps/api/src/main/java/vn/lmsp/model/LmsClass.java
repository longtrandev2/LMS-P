package vn.lmsp.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import vn.lmsp.enums.ClassStatus;

@Entity
@Table(name = "classes", uniqueConstraints = @UniqueConstraint(name = "uq_classes_course_code", columnNames = {"course_id", "code"}))
public class LmsClass {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id", nullable = false) private Course course;
    @Column(nullable = false, length = 30) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false, length = 20) private String semester;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lecturer_id", nullable = false) private User lecturer;
    @Column(name = "max_students") private Integer maxStudents;
    @Column(name = "enroll_from") private LocalDateTime enrollFrom;
    @Column(name = "enroll_until") private LocalDateTime enrollUntil;
    @Column(length = 50) private String room;
    @Column(length = 100) private String schedule;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ClassStatus status = ClassStatus.active;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "grade_policy", columnDefinition = "json") private JsonNode gradePolicy;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected LmsClass() { }
    public LmsClass(Course course, String code, String name, String semester, User lecturer, JsonNode gradePolicy,
                    Integer maxStudents, LocalDateTime enrollFrom, LocalDateTime enrollUntil,
                    String room, String schedule, ClassStatus status) {
        this.course = course; this.code = code; this.name = name; this.semester = semester;
        this.lecturer = lecturer; this.gradePolicy = gradePolicy; this.maxStudents = maxStudents;
        this.enrollFrom = enrollFrom; this.enrollUntil = enrollUntil; this.room = room; this.schedule = schedule;
        this.status = status == null ? ClassStatus.active : status;
    }
    @PrePersist void createTimestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Course getCourse() { return course; }
    public Long getCourseId() { return course.getId(); }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getSemester() { return semester; }
    public User getLecturer() { return lecturer; }
    public Long getLecturerId() { return lecturer.getId(); }
    public Integer getMaxStudents() { return maxStudents; }
    public LocalDateTime getEnrollFrom() { return enrollFrom; }
    public LocalDateTime getEnrollUntil() { return enrollUntil; }
    public String getRoom() { return room; }
    public String getSchedule() { return schedule; }
    public ClassStatus getStatus() { return status; }
    public JsonNode getGradePolicy() { return gradePolicy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void update(String code, String name, String semester, User lecturer, JsonNode policy,
                       Integer maxStudents, LocalDateTime enrollFrom, LocalDateTime enrollUntil,
                       String room, String schedule, ClassStatus status) {
        if (code != null) this.code = code;
        if (name != null) this.name = name;
        if (semester != null) this.semester = semester;
        if (lecturer != null) this.lecturer = lecturer;
        if (policy != null) this.gradePolicy = policy;
        if (maxStudents != null) this.maxStudents = maxStudents;
        if (enrollFrom != null) this.enrollFrom = enrollFrom;
        if (enrollUntil != null) this.enrollUntil = enrollUntil;
        if (room != null) this.room = room;
        if (schedule != null) this.schedule = schedule;
        if (status != null) this.status = status;
    }
    public void updateEnrollmentSettings(Integer capacity, LocalDateTime from, LocalDateTime until,
                                         String room, String schedule, ClassStatus status) {
        this.maxStudents = capacity; this.enrollFrom = from; this.enrollUntil = until;
        this.room = room; this.schedule = schedule; if (status != null) this.status = status;
    }
}
