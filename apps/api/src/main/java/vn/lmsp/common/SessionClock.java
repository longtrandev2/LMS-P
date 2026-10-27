package vn.lmsp.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Khung tiết theo giờ Việt Nam — docs/class-schedule-grades-spec.md §2.1.
 * Tiết n (1–14) bắt đầu 06:00 + n giờ, dài 50 phút; giá trị trả về là UTC (không hậu tố).
 */
public final class SessionClock {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final int FIRST_PERIOD = 1;
    public static final int LAST_PERIOD = 14;
    private static final int PERIOD_MINUTES = 50;

    private SessionClock() { }

    public static LocalDateTime startsAt(LocalDate date, int period) {
        return toUtc(date.atTime(6 + period, 0));
    }

    public static LocalDateTime endsAt(LocalDate date, int period) {
        return toUtc(date.atTime(6 + period, PERIOD_MINUTES));
    }

    /** Giờ VN (để hiển thị trong thông báo) của một mốc UTC. */
    public static LocalDateTime toLocal(LocalDateTime utc) {
        return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(ZONE).toLocalDateTime();
    }

    private static LocalDateTime toUtc(LocalDateTime local) {
        return local.atZone(ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }
}
