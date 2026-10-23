package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
public class Course {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 20) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(columnDefinition = "TEXT") private String description;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected Course() { }
    public Course(String code, String name, String description, User creator) {
        this.code = code; this.name = name; this.description = description; this.creator = creator;
    }
    @PrePersist void createTimestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Long getCreatedBy() { return creator.getId(); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void update(String code, String name, String description) {
        if (code != null) this.code = code;
        if (name != null) this.name = name;
        if (description != null) this.description = description;
    }
}
