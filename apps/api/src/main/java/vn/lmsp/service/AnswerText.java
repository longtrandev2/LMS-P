package vn.lmsp.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Chuẩn hóa chuỗi trả lời — docs/assessment-spec.md §3.1. Không bỏ dấu tiếng Việt. */
public final class AnswerText {
    private static final Pattern SPACES = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);

    private AnswerText() { }

    /** NFC → bỏ khoảng trắng hai đầu → gộp khoảng trắng liên tiếp thành một dấu cách (giữ hoa/thường). */
    public static String normalize(String value) {
        if (value == null) return null;
        String nfc = Normalizer.normalize(value, Normalizer.Form.NFC);
        return SPACES.matcher(nfc.strip()).replaceAll(" ");
    }

    /** So khớp sau chuẩn hóa; `caseSensitive` vắng = không phân biệt hoa/thường. Chuỗi rỗng không bao giờ đúng. */
    public static boolean matchesAny(String answer, List<String> accepted, Boolean caseSensitive) {
        if (answer == null || accepted == null) return false;
        boolean exact = Boolean.TRUE.equals(caseSensitive);
        String given = fold(normalize(answer), exact);
        if (given.isEmpty()) return false;
        return accepted.stream().filter(java.util.Objects::nonNull)
                .anyMatch(item -> fold(normalize(item), exact).equals(given));
    }

    private static String fold(String value, boolean exact) {
        return exact ? value : value.toLowerCase(Locale.ROOT);
    }
}
