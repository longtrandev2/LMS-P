package vn.lmsp.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Đối tượng nhận thông báo hệ thống — docs/admin-spec.md §5.1. */
public enum AnnouncementAudience {
    ALL("all"), ROLE("role"), CLASS("class");

    private final String value;

    AnnouncementAudience(String value) { this.value = value; }

    @JsonValue
    public String value() { return value; }

    @JsonCreator
    public static AnnouncementAudience fromValue(String value) {
        for (AnnouncementAudience audience : values()) if (audience.value.equals(value)) return audience;
        throw new IllegalArgumentException("Đối tượng nhận không hợp lệ: " + value);
    }
}
