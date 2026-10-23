package vn.lmsp.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    protected RefreshToken() { }
    public RefreshToken(User user, String hash, LocalDateTime expiresAt) {
        this.user = user; this.tokenHash = hash; this.expiresAt = expiresAt; this.createdAt = LocalDateTime.now();
    }
    public User getUser() { return user; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void revoke() { revokedAt = LocalDateTime.now(); }
}
