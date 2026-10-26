package vn.lmsp.worker;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** So khớp output với expected theo `checker_mode` — docs/assessment-spec.md §4.1. */
public final class OutputChecker {
    public static final double DEFAULT_EPSILON = 1e-6;
    private static final Pattern NUMBER = Pattern.compile("[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?");

    public enum Mode { TOKEN, LINE, FLOAT }

    private final Mode mode;
    private final double epsilon;

    private OutputChecker(Mode mode, double epsilon) {
        this.mode = mode;
        this.epsilon = epsilon;
    }

    /** `mode` null → `token` (snapshot cũ); `epsilon` null/không hợp lệ → 1e-6. */
    public static OutputChecker of(String mode, Double epsilon) {
        Mode parsed = switch (mode == null ? "token" : mode) {
            case "token" -> Mode.TOKEN;
            case "line" -> Mode.LINE;
            case "float" -> Mode.FLOAT;
            default -> throw new IllegalArgumentException("Unknown checker mode");
        };
        boolean valid = epsilon != null && Double.isFinite(epsilon) && epsilon > 0;
        return new OutputChecker(parsed, valid ? epsilon : DEFAULT_EPSILON);
    }

    public Mode mode() { return mode; }
    public double epsilon() { return epsilon; }

    public boolean accepts(String actual, String expected) {
        return switch (mode) {
            case TOKEN -> tokens(actual).equals(tokens(expected));
            case LINE -> lines(actual).equals(lines(expected));
            case FLOAT -> floatTokensMatch(tokens(actual), tokens(expected));
        };
    }

    static List<String> tokens(String text) {
        var result = new ArrayList<String>();
        int start = -1;
        for (int i = 0; i < text.length(); i++) {
            if (isSpace(text.charAt(i))) {
                if (start >= 0) result.add(text.substring(start, i));
                start = -1;
            } else if (start < 0) {
                start = i;
            }
        }
        if (start >= 0) result.add(text.substring(start));
        return result;
    }

    static List<String> lines(String text) {
        String[] raw = text.replace("\r\n", "\n").split("\n", -1);
        var result = new ArrayList<String>(raw.length);
        for (String line : raw) {
            int end = line.length();
            while (end > 0 && isSpace(line.charAt(end - 1))) end--;
            result.add(line.substring(0, end));
        }
        while (!result.isEmpty() && result.get(result.size() - 1).isEmpty()) result.remove(result.size() - 1);
        return result;
    }

    private boolean floatTokensMatch(List<String> actual, List<String> expected) {
        if (actual.size() != expected.size()) return false;
        for (int i = 0; i < actual.size(); i++) {
            String a = actual.get(i);
            String b = expected.get(i);
            Double x = finiteNumber(a);
            Double y = finiteNumber(b);
            if (x != null && y != null) {
                double diff = Math.abs(x - y);
                if (!(diff <= epsilon || diff <= epsilon * Math.abs(y))) return false;
            } else if (!a.equals(b)) {
                return false;
            }
        }
        return true;
    }

    /** Số thực hữu hạn dạng thập phân; NaN, Infinity, hex, hậu tố d/f và số tràn không tính là số. */
    static Double finiteNumber(String token) {
        if (!NUMBER.matcher(token).matches()) return null;
        double value = Double.parseDouble(token);
        return Double.isFinite(value) ? value : null;
    }

    private static boolean isSpace(char c) {
        return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\u000B';
    }
}
