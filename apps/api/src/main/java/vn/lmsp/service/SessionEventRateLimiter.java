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
 * Giới hạn 60 sự kiện client mỗi phút mỗi phiên (cửa sổ trượt, bộ nhớ trong tiến trình) — docs/exam-spec.md §5.5.
 * Như {@link PracticeRateLimiter}: một instance API là đủ cho đồ án.
 */
@Component
public class SessionEventRateLimiter {
    static final int LIMIT = 60;
    static final long WINDOW_MS = 60_000;
    private static final int SWEEP_THRESHOLD = 5_000;
    private final Map<Long, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    public SessionEventRateLimiter() { this(Clock.systemUTC()); }
    SessionEventRateLimiter(Clock clock) { this.clock = clock; }

    public void acquire(Long sessionId) {
        long now = clock.millis();
        if (hits.size() > SWEEP_THRESHOLD) evictIdle(now);
        Deque<Long> window = hits.computeIfAbsent(sessionId, ignored -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= WINDOW_MS) window.pollFirst();
            if (window.size() >= LIMIT)
                throw new LmsException("RATE_LIMITED", "Gửi sự kiện quá nhanh; tối đa 60 lần mỗi phút",
                        HttpStatus.TOO_MANY_REQUESTS, Map.of("retry_after_seconds", retryAfter(window.peekFirst(), now)));
            window.addLast(now);
        }
    }

    /** Bỏ các phiên không gửi gì trong một cửa sổ để bộ nhớ không tăng mãi. */
    private void evictIdle(long now) {
        hits.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                Long last = entry.getValue().peekLast();
                return last == null || now - last >= WINDOW_MS;
            }
        });
    }

    private long retryAfter(long oldest, long now) {
        return Math.max(1, (WINDOW_MS - (now - oldest) + 999) / 1000);
    }
}
