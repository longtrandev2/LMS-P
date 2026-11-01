package vn.lmsp.service;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AdminDtos.OnlineUsers;

/**
 * User "online" = có request REST đã xác thực trong 5 phút gần nhất (docs/admin-spec.md §3).
 * Bộ đếm trong bộ nhớ của một instance API, mất khi khởi động lại.
 */
@Component
public class ActivityTracker {
    static final long WINDOW_MS = 5 * 60_000L;
    private final Map<Long, Seen> seen = new ConcurrentHashMap<>();
    private final LongSupplier clock;

    private record Seen(String role, long at) { }

    public ActivityTracker() { this(System::currentTimeMillis); }

    ActivityTracker(LongSupplier clock) { this.clock = clock; }

    /** `roles` là tên vai trò thường (`student`, `lecturer`, `admin`); user nhiều vai trò tính theo vai trò cao nhất. */
    public void touch(Long userId, Collection<String> roles) {
        if (userId != null) seen.put(userId, new Seen(primaryRole(roles), clock.getAsLong()));
    }

    public OnlineUsers online() {
        long cutoff = clock.getAsLong() - WINDOW_MS;
        long student = 0, lecturer = 0, admin = 0, total = 0;
        for (Seen entry : seen.values()) {
            if (entry.at() < cutoff) continue;
            total++;
            switch (entry.role()) {
                case "admin" -> admin++;
                case "lecturer" -> lecturer++;
                case "student" -> student++;
                default -> { }
            }
        }
        return new OnlineUsers(student, lecturer, admin, total);
    }

    /** Dọn mục quá hạn để bộ nhớ không tăng theo số user từng đăng nhập. */
    @Scheduled(fixedDelay = 60_000)
    public void prune() {
        long cutoff = clock.getAsLong() - WINDOW_MS;
        seen.values().removeIf(entry -> entry.at() < cutoff);
    }

    int size() { return seen.size(); }

    static String primaryRole(Collection<String> roles) {
        if (roles == null) return "";
        if (roles.contains("admin")) return "admin";
        if (roles.contains("lecturer")) return "lecturer";
        return roles.contains("student") ? "student" : "";
    }
}
