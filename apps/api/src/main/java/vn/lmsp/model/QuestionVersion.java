package vn.lmsp.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "question_versions", uniqueConstraints = @UniqueConstraint(name = "uq_question_versions_no", columnNames = {"question_id", "version_no"}))
public class QuestionVersion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @Column(name = "version_no", nullable = false) private int versionNo;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "json") private JsonNode snapshot;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected QuestionVersion() { }
    public QuestionVersion(Question question, int versionNo, JsonNode snapshot, User creator) {
        this.question = question; this.versionNo = versionNo; this.snapshot = snapshot; this.creator = creator;
    }
    @PrePersist void timestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public int getVersionNo() { return versionNo; }
    public JsonNode getSnapshot() { return snapshot; }
}
