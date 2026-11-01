package vn.lmsp.common;

import java.nio.charset.StandardCharsets;

public final class Utf8Text {
    private Utf8Text() { }

    public static String truncate(String value, int maxBytes) {
        if (value == null) return null;
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) return value;
        int end = maxBytes;
        while (end > 0 && (bytes[end] & 0xc0) == 0x80) end--;
        return new String(bytes, 0, end, StandardCharsets.UTF_8);
    }
}
