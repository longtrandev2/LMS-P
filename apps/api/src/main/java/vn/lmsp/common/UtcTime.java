package vn.lmsp.common;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

public final class UtcTime {
    private UtcTime() { }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
