package vn.lmsp.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.lmsp.common.LmsException;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/** Chống dò mật khẩu (FR-AUTH-01): sai liên tiếp 5 lần theo tài khoản -> khóa tạm 15 phút (429 RATE_LIMITED). In-memory, 1 instance API v1 (TD-05). */
@Service
public class LoginThrottle {
    public static final int MAX_ATTEMPTS = 5;
    public static final int LOCK_MINUTES = 15;
    private record Attempt(int failures, LocalDateTime blockedUntil) { }
    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public void assertNotBlocked(String account) {
        Attempt attempt = attempts.get(key(account));
        if (attempt != null && attempt.blockedUntil() != null && attempt.blockedUntil().isAfter(LocalDateTime.now()))
            throw new LmsException("RATE_LIMITED", "Tài khoản tạm khóa do đăng nhập sai nhiều lần.", HttpStatus.TOO_MANY_REQUESTS, null);
    }
    public void recordFailure(String account) {
        attempts.compute(key(account), (ignored, old) -> {
            int failures = old == null || old.blockedUntil() != null ? 1 : old.failures() + 1;
            return failures >= MAX_ATTEMPTS ? new Attempt(failures, LocalDateTime.now().plusMinutes(LOCK_MINUTES)) : new Attempt(failures, null);
        });
    }
    public void reset(String account) { attempts.remove(key(account)); }
    private String key(String account) { return account.toLowerCase(); }
}
