package vn.lmsp.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class SessionClockTest {
    private static final LocalDate DAY = LocalDate.of(2026, 10, 27);

    @Test void periodOneStartsAtSevenVietnamTimeWhichIsMidnightUtc() {
        assertThat(SessionClock.startsAt(DAY, 1)).isEqualTo(LocalDateTime.of(2026, 10, 27, 0, 0));
        assertThat(SessionClock.endsAt(DAY, 1)).isEqualTo(LocalDateTime.of(2026, 10, 27, 0, 50));
    }

    @Test void laterPeriodsFollowTheHourlyGridWithFiftyMinuteLength() {
        assertThat(SessionClock.startsAt(DAY, 10)).isEqualTo(LocalDateTime.of(2026, 10, 27, 9, 0));
        assertThat(SessionClock.endsAt(DAY, 11)).isEqualTo(LocalDateTime.of(2026, 10, 27, 10, 50));
        assertThat(SessionClock.endsAt(DAY, 14)).isEqualTo(LocalDateTime.of(2026, 10, 27, 13, 50));
    }

    @Test void utcConvertsBackToVietnamLocalTime() {
        assertThat(SessionClock.toLocal(SessionClock.startsAt(DAY, 3))).isEqualTo(LocalDateTime.of(2026, 10, 27, 9, 0));
    }
}
