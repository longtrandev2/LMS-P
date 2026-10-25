package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "question_banks")
public class QuestionBank {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private Course course;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "owner_id", nullable = false) private User owner;
    @Column(nullable = false, length = 100) private String name;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(nullable = false, length = 16) private String visibility = "private";
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected QuestionBank() { }
    public QuestionBank(Course course, User owner, String name, String description, String visibility, User creator) {
        this.course = course; this.owner = owner; this.name = name; this.description = description;
        this.visibility = visibility; this.creator = creator;
    }
    public QuestionBank(Course course, User owner, String name, String description, User creator) {
        this(course, owner, name, description, course == null ? "private" : "shared", creator);
    }
    @PrePersist void timestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getCourseId() { return course == null ? null : course.getId(); }
    public String getCourseName() { return course == null ? null : course.getName(); }
    public Long getOwnerId() { return owner.getId(); }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String value) { visibility = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
