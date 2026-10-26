package vn.lmsp.service;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;

/**
 * Giới hạn chạy thử 6 lần/phút/sinh viên (cửa sổ trượt, bộ nhớ trong tiến trình) — docs/assessment-spec.md §7.
 * Một instance API là đủ cho đồ án; nhiều instance sẽ cần bộ đếm dùng chung.
 */
@Component
public class PracticeRateLimiter {
    static final int LIMIT = 6;
    static final long WINDOW_MS = 60_000;
    private final Map<Long, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    public PracticeRateLimiter() { this(Clock.systemUTC()); }
    PracticeRateLimiter(Clock clock) { this.clock = clock; }

    public void acquire(Long studentId) {
        long now = clock.millis();
        Deque<Long> window = hits.computeIfAbsent(studentId, ignored -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= WINDOW_MS) window.pollFirst();
            if (window.size() >= LIMIT)
                throw new LmsException("RATE_LIMITED", "Bạn chạy thử quá nhanh; tối đa 6 lần mỗi phút",
                        HttpStatus.TOO_MANY_REQUESTS, Map.of("retry_after_seconds", retryAfter(window.peekFirst(), now)));
            window.addLast(now);
        }
    }

    private long retryAfter(long oldest, long now) {
        return Math.max(1, (WINDOW_MS - (now - oldest) + 999) / 1000);
    }
}
