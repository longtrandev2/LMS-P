package vn.lmsp.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.lmsp.model.User;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtTokenService {
    private final javax.crypto.SecretKey key;
    private final long accessTtlMinutes;
    public JwtTokenService(@Value("${lms.jwt.secret}") String secret,
                           @Value("${lms.jwt.access-ttl-minutes:15}") long ttl) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("JWT_SECRET must contain at least 32 characters");
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        accessTtlMinutes = ttl;
    }
    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getId().toString())
                .claim("roles", user.getRoles().stream().map(role -> role.getName()).toList())
                .claim("type", "access").issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTtlMinutes * 60)))
                .signWith(key).compact();
    }
    public io.jsonwebtoken.Claims parseAccessToken(String token) {
        var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        if (!"access".equals(claims.get("type", String.class))) throw new IllegalArgumentException("Wrong token type");
        return claims;
    }
}
