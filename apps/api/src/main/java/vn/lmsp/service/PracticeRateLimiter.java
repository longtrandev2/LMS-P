package vn.lmsp.service;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;

/**
 * Giới hạn chạy thử N lần/phút/sinh viên (cửa sổ trượt, bộ nhớ trong tiến trình) — docs/assessment-spec.md §7.
 * N = `practice_runs_per_minute` (mặc định 6) — docs/admin-spec.md §1.
 * Một instance API là đủ cho đồ án; nhiều instance sẽ cần bộ đếm dùng chung.
 */
@Component
public class PracticeRateLimiter {
    static final long WINDOW_MS = 60_000;
    private final Map<Long, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final SettingsProvider settings;
    private final Clock clock;

    @Autowired
    public PracticeRateLimiter(SettingsProvider settings) { this(settings, Clock.systemUTC()); }
    PracticeRateLimiter(SettingsProvider settings, Clock clock) { this.settings = settings; this.clock = clock; }

    public void acquire(Long studentId) {
        long now = clock.millis();
        int limit = settings.practiceRunsPerMinute();
        Deque<Long> window = hits.computeIfAbsent(studentId, ignored -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= WINDOW_MS) window.pollFirst();
            if (window.size() >= limit)
                throw new LmsException("RATE_LIMITED", "Bạn chạy thử quá nhanh; tối đa " + limit + " lần mỗi phút",
                        HttpStatus.TOO_MANY_REQUESTS, Map.of("retry_after_seconds", retryAfter(window.peekFirst(), now)));
            window.addLast(now);
        }
    }

    private long retryAfter(long oldest, long now) {
        return Math.max(1, (WINDOW_MS - (now - oldest) + 999) / 1000);
    }
}
