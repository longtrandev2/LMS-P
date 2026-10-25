package vn.lmsp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.TokenPair;
import vn.lmsp.dto.UserSummary;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.mapper.UserMapper;
import vn.lmsp.model.RefreshToken;
import vn.lmsp.model.User;
import vn.lmsp.repository.RefreshTokenRepository;
import vn.lmsp.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private record Attempt(int failures, LocalDateTime blockedUntil) { }
    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final JwtTokenService jwt;
    private final UserMapper mapper;
    private final int refreshTtlDays;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwords,
                       JwtTokenService jwt, UserMapper mapper, @Value("${lms.jwt.refresh-ttl-days:7}") int refreshTtlDays) {
        this.users = users; this.refreshTokens = refreshTokens; this.passwords = passwords;
        this.jwt = jwt; this.mapper = mapper; this.refreshTtlDays = refreshTtlDays;
    }

    @Transactional
    public TokenPair login(String email, String password) {
        Attempt attempt = attempts.get(email.toLowerCase());
        if (attempt != null && attempt.blockedUntil() != null && attempt.blockedUntil().isAfter(LocalDateTime.now()))
            throw new LmsException("RATE_LIMITED", "Tài khoản tạm khóa do đăng nhập sai nhiều lần.", HttpStatus.TOO_MANY_REQUESTS, null);
        User user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || user.getStatus() != UserStatus.active || !passwords.matches(password, user.getPasswordHash())) {
            recordFailure(email);
            throw new LmsException("UNAUTHENTICATED", "Email hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED, null);
        }
        attempts.remove(email.toLowerCase());
        user.setLastLoginAt(LocalDateTime.now());
        return issuePair(user);
    }

    @Transactional
    public TokenPair refresh(String rawToken) {
        RefreshToken old = refreshTokens.findByTokenHash(hash(rawToken)).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (old == null || old.getRevokedAt() != null || !old.getExpiresAt().isAfter(now))
            throw unauthenticated("Refresh token không hợp lệ hoặc đã hết hạn");
        User user = users.findWithRolesById(old.getUser().getId()).orElseThrow(() -> unauthenticated("Tài khoản không khả dụng"));
        if (user.getStatus() != UserStatus.active) throw unauthenticated("Tài khoản không khả dụng");
        old.revoke();
        return issuePair(user);
    }

    @Transactional
    public void logoutAll(Long userId) {
        refreshTokens.findAllByUser_IdAndRevokedAtIsNull(userId).forEach(RefreshToken::revoke);
    }

    @Transactional
    public void logout(String rawToken) {
        refreshTokens.findByTokenHash(hash(rawToken)).filter(token -> token.getRevokedAt() == null).ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public UserSummary me(Long id) {
        return users.findWithRolesById(id).map(mapper::toSummary)
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null));
    }

    private TokenPair issuePair(User user) {
        byte[] bytes = new byte[48]; random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user, hash(refresh), LocalDateTime.now().plusDays(refreshTtlDays)));
        return new TokenPair(jwt.issueAccessToken(user), refresh, mapper.toSummary(user));
    }
    private void recordFailure(String email) {
        String key = email.toLowerCase();
        attempts.compute(key, (ignored, old) -> {
            int failures = old == null || old.blockedUntil() != null ? 1 : old.failures() + 1;
            return failures >= 5 ? new Attempt(failures, LocalDateTime.now().plusMinutes(15)) : new Attempt(failures, null);
        });
    }
    private String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    private LmsException unauthenticated(String message) {
        return new LmsException("UNAUTHENTICATED", message, HttpStatus.UNAUTHORIZED, null);
    }
}

