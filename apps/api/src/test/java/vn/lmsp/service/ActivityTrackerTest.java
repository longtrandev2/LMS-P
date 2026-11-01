package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.AdminDtos.OnlineUsers;

class ActivityTrackerTest {
    private final AtomicLong now = new AtomicLong(1_000_000);
    private final ActivityTracker tracker = new ActivityTracker(now::get);

    @Test void countsDistinctUsersSeenInTheLastFiveMinutesByHighestRole() {
        tracker.touch(1L, List.of("student"));
        tracker.touch(1L, List.of("student"));
        tracker.touch(2L, List.of("lecturer"));
        tracker.touch(3L, List.of("lecturer", "admin"));
        tracker.touch(null, List.of("student"));

        assertThat(tracker.online()).isEqualTo(new OnlineUsers(1, 1, 1, 3));
    }

    @Test void usersIdleForMoreThanFiveMinutesAreNotOnlineAndArePruned() {
        tracker.touch(1L, List.of("student"));
        now.addAndGet(ActivityTracker.WINDOW_MS - 1);
        tracker.touch(2L, List.of("student"));
        assertThat(tracker.online().total()).isEqualTo(2);

        now.addAndGet(2);
        assertThat(tracker.online()).isEqualTo(new OnlineUsers(1, 0, 0, 1));
        tracker.prune();
        assertThat(tracker.size()).isEqualTo(1);

        now.addAndGet(ActivityTracker.WINDOW_MS);
        tracker.prune();
        assertThat(tracker.size()).isZero();
        assertThat(tracker.online().total()).isZero();
    }

    @Test void primaryRolePrefersAdminThenLecturer() {
        assertThat(ActivityTracker.primaryRole(List.of("student", "admin"))).isEqualTo("admin");
        assertThat(ActivityTracker.primaryRole(List.of("student", "lecturer"))).isEqualTo("lecturer");
        assertThat(ActivityTracker.primaryRole(List.of())).isEmpty();
    }
}
