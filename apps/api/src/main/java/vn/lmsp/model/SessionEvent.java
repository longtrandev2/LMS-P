package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;
import vn.lmsp.enums.SessionEventType;

/** Nhật ký sự kiện phiên — docs/exam-spec.md §5.5. */
@Entity
@Table(name = "session_events")
@Getter
public class SessionEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "session_id", nullable = false) private AttemptSession session;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private SessionEventType type;
    @Column(name = "occurred_at", nullable = false) private LocalDateTime occurredAt;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") private Map<String, Object> detail;
    protected SessionEvent() { }
    public SessionEvent(AttemptSession session, SessionEventType type, LocalDateTime occurredAt, Map<String, Object> detail) {
        this.session = session; this.type = type; this.occurredAt = occurredAt; this.detail = detail;
    }
    public Long getSessionId() { return session.getId(); }
}
