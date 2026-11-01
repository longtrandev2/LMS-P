package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

/** Một khóa cấu hình hệ thống — docs/admin-spec.md §1. Giá trị là JSON (chuỗi JSON thô). */
@Entity
@Table(name = "system_settings")
@Getter
public class SystemSetting {
    @Id @Column(name = "setting_key", length = 60) private String key;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "setting_value", nullable = false, columnDefinition = "json") private String value;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "updated_by") private User updatedBy;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    protected SystemSetting() { }
    public SystemSetting(String key, String value, User updatedBy, LocalDateTime now) {
        this.key = key; update(value, updatedBy, now);
    }
    public void update(String value, User updatedBy, LocalDateTime now) {
        this.value = value; this.updatedBy = updatedBy; this.updatedAt = now;
    }
}
