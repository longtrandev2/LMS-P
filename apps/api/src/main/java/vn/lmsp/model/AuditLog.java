package vn.lmsp.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name="audit_logs")
public class AuditLog {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="actor_id") private Long actorId;
    @Column(nullable=false,length=60) private String action;
    @Column(name="entity_type",nullable=false,length=40) private String entityType;
    @Column(name="entity_id",nullable=false) private Long entityId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="old_value",columnDefinition="json") private JsonNode oldValue;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="new_value",columnDefinition="json") private JsonNode newValue;
    @Column(length=45) private String ip;
    @Column(name="created_at",nullable=false) private LocalDateTime createdAt;
    protected AuditLog() { }
    public AuditLog(Long actorId,String action,String entityType,Long entityId,JsonNode oldValue,JsonNode newValue,String ip) {
        this.actorId=actorId; this.action=action; this.entityType=entityType; this.entityId=entityId;
        this.oldValue=oldValue; this.newValue=newValue; this.ip=ip; this.createdAt=LocalDateTime.now();
    }
    public Long getId() { return id; }
    public Long getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public JsonNode getOldValue() { return oldValue; }
    public JsonNode getNewValue() { return newValue; }
    public String getIp() { return ip; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
