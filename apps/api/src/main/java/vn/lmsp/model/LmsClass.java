package vn.lmsp.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.lmsp.enums.ClassStatus;
import java.time.LocalDateTime;

@Entity
@Table(name = "classes", uniqueConstraints = @UniqueConstraint(name = "uq_classes_course_code", columnNames = {"course_id", "code"}))
public class LmsClass {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id", nullable = false) private Course course;
    @Column(nullable = false, length = 30) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false, length = 20) private String semester;
    @Column(name = "max_students") private Integer maxStudents;
    @Column(length = 50) private String room;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ClassStatus status = ClassStatus.active;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lecturer_id", nullable = false) private User lecturer;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "co_lecturer_id") private User coLecturer;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "grade_policy", columnDefinition = "json") private JsonNode gradePolicy;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected LmsClass() { }
    public LmsClass(Course course, String code, String name, String semester, User lecturer, JsonNode gradePolicy) {
        this.course = course; this.code = code; this.name = name; this.semester = semester;
        this.lecturer = lecturer; this.gradePolicy = gradePolicy;
    }
    @PrePersist void createTimestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Course getCourse() { return course; }
    public Long getCourseId() { return course.getId(); }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getSemester() { return semester; }
    public Integer getMaxStudents() { return maxStudents; }
    public String getRoom() { return room; }
    public ClassStatus getStatus() { return status; }
    public User getLecturer() { return lecturer; }
    public Long getLecturerId() { return lecturer.getId(); }
    public User getCoLecturer() { return coLecturer; }
    public Long getCoLecturerId() { return coLecturer == null ? null : coLecturer.getId(); }
    public JsonNode getGradePolicy() { return gradePolicy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void update(String code, String name, String semester, User lecturer, User coLecturer, JsonNode policy,
                       Integer maxStudents, String room, ClassStatus status) {
        if (code != null) this.code = code;
        if (name != null) this.name = name;
        if (semester != null) this.semester = semester;
        if (lecturer != null) this.lecturer = lecturer;
        if (coLecturer != null) this.coLecturer = coLecturer;
        if (policy != null) this.gradePolicy = policy;
        if (maxStudents != null) this.maxStudents = maxStudents;
        if (room != null) this.room = room;
        if (status != null) this.status = status;
    }
}
