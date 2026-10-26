package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

@Entity
@Table(name="notifications")
@Getter
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id", nullable=false) private User user;
    @Column(nullable=false, length=40) private String type;
    @Column(nullable=false, length=200) private String title;
    @Column(columnDefinition="TEXT") private String body;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="json") private JsonNode data;
    @Column(name="is_read", nullable=false) private boolean read;
    @Column(name="created_at", nullable=false) private LocalDateTime createdAt;
    protected Notification() { }
    public Notification(User user, String type, String title, String body, JsonNode data) {
        this.user=user; this.type=type; this.title=title; this.body=body; this.data=data;
    }
    @PrePersist void timestamp() { createdAt=LocalDateTime.now(); }
    public void markRead() { read=true; }
}
