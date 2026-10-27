package vn.lmsp.worker;

import java.nio.charset.StandardCharsets;

/** Giải mã và cắt output theo số byte UTF-8 mà không cắt giữa một ký tự. */
public final class OutputText {
    public static final int EVENT_OUTPUT_BYTES = 4 * 1024;

    private OutputText() { }

    public static String decode(byte[] bytes) {
        return bytes == null ? "" : new String(bytes, StandardCharsets.UTF_8);
    }

    public static String truncate(String text, int maxBytes) {
        if (text == null) return null;
        if (maxBytes <= 0) return "";
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) return text;
        int end = maxBytes;
        while (end > 0 && (bytes[end] & 0xC0) == 0x80) end--;
        return new String(bytes, 0, end, StandardCharsets.UTF_8);
    }
}
