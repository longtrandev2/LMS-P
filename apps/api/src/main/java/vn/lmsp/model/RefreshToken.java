package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    /** Phiên đăng nhập: giữ nguyên qua các lần refresh — docs/admin-spec.md §6. */
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name = "session_family", nullable = false, length = 36)
    private String sessionFamily;
    @Column(length = 45)
    private String ip;
    @Column(name = "user_agent", length = 255)
    private String userAgent;
    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    protected RefreshToken() { }
    public RefreshToken(User user, String hash, LocalDateTime expiresAt) {
        this(user, hash, expiresAt, java.util.UUID.randomUUID().toString(), null, null);
    }
    /** `family` = phiên đăng nhập (đăng nhập mới → UUID mới; refresh → family của token cũ). */
    public RefreshToken(User user, String hash, LocalDateTime expiresAt, String family, String ip, String userAgent) {
        this.user = user; this.tokenHash = hash; this.expiresAt = expiresAt; this.createdAt = LocalDateTime.now();
        this.sessionFamily = family; this.ip = ip;
        this.userAgent = userAgent == null || userAgent.length() <= 255 ? userAgent : userAgent.substring(0, 255);
        this.lastUsedAt = createdAt;
    }
    public Long getUserId() { return user.getId(); }
    public void revoke() { revokedAt = LocalDateTime.now(); }
}
