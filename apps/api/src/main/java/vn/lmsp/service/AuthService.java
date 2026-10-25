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
import vn.lmsp.model.RefreshToken;
import vn.lmsp.model.User;
import vn.lmsp.repository.RefreshTokenRepository;
import vn.lmsp.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final JwtTokenService jwt;
    private final LoginThrottle throttle;
    private final int refreshTtlDays;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwords,
                       JwtTokenService jwt, LoginThrottle throttle,
                       @Value("${lms.jwt.refresh-ttl-days:7}") int refreshTtlDays) {
        this.users = users; this.refreshTokens = refreshTokens; this.passwords = passwords;
        this.jwt = jwt; this.throttle = throttle; this.refreshTtlDays = refreshTtlDays;
    }

    @Transactional
    public TokenPair login(String account, String password) {
        throttle.assertNotBlocked(account);
        User user = resolve(account);
        if (user == null || user.getStatus() != UserStatus.active || !passwords.matches(password, user.getPasswordHash())) {
            throttle.recordFailure(account);
            throw new LmsException("UNAUTHENTICATED", "Tài khoản hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED, null);
        }
        throttle.reset(account);
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
        return users.findWithRolesById(id).map(UserSummary::from)
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null));
    }

    private User resolve(String account) {
        return users.findByEmailIgnoreCase(account).orElseGet(() -> users.findByStudentCodeIgnoreCase(account).orElse(null));
    }
    private TokenPair issuePair(User user) {
        byte[] bytes = new byte[48]; random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user, hash(refresh), LocalDateTime.now().plusDays(refreshTtlDays)));
        return new TokenPair(jwt.issueAccessToken(user), refresh, UserSummary.from(user));
    }
    private String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    private LmsException unauthenticated(String message) {
        return new LmsException("UNAUTHENTICATED", message, HttpStatus.UNAUTHORIZED, null);
    }
}
