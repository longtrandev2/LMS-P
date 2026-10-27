package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Getter
public class Course {
    public static final int DEFAULT_CREDITS = 3;
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 20) private String code;
    @Column(nullable = false, length = 200) private String name;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(nullable = false, columnDefinition = "tinyint unsigned") private int credits = DEFAULT_CREDITS;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected Course() { }
    public Course(String code, String name, String description, User creator) {
        this(code, name, description, null, creator);
    }
    public Course(String code, String name, String description, Integer credits, User creator) {
        this.code = code; this.name = name; this.description = description; this.creator = creator;
        this.credits = credits == null ? DEFAULT_CREDITS : credits;
    }
    @PrePersist void createTimestamp() { createdAt = LocalDateTime.now(); }
    public Long getCreatedBy() { return creator.getId(); }
    public void update(String code, String name, String description) { update(code, name, description, null); }
    public void update(String code, String name, String description, Integer credits) {
        if (code != null) this.code = code;
        if (name != null) this.name = name;
        if (description != null) this.description = description;
        if (credits != null) this.credits = credits;
    }
}
