package vn.lmsp.model;

import jakarta.persistence.*;
import vn.lmsp.enums.MaterialType;
import java.time.LocalDateTime;

@Entity
@Table(name="materials")
public class Material {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="class_id", nullable=false) private LmsClass lmsClass;
    /** Buổi học liên quan (nullable — học liệu lớp chung khi chưa gắn buổi). */
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="session_id") private ClassSession session;
    @Column(nullable=false, length=200) private String title;
    @Column(columnDefinition="TEXT") private String description;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private MaterialType type;
    @Column(name="file_path", length=500) private String filePath;
    @Column(name="size_bytes", nullable=false) private long sizeBytes;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="uploaded_by", nullable=false) private User uploader;
    @Column(name="created_at", nullable=false) private LocalDateTime createdAt;
    protected Material() { }
    public Material(LmsClass lmsClass, String title, String description, String type, String filePath, long sizeBytes, User uploader) {
        this.lmsClass=lmsClass; this.title=title; this.description=description; this.type=MaterialType.valueOf(type); this.filePath=filePath; this.sizeBytes=sizeBytes; this.uploader=uploader;
    }
    @PrePersist void timestamp() { createdAt=LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getClassId() { return lmsClass.getId(); }
    public ClassSession getSession() { return session; }
    public Long getSessionId() { return session == null ? null : session.getId(); }
    public void setSession(ClassSession value) { this.session = value; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getType() { return type.name(); }
    public String getFilePath() { return filePath; }
    public long getSizeBytes() { return sizeBytes; }
    public Long getUploadedBy() { return uploader.getId(); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void update(String title, String description) { if(title!=null) this.title=title; if(description!=null) this.description=description; }
}
