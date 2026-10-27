package vn.lmsp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import vn.lmsp.dto.GradebookDtos.Weights;
import vn.lmsp.enums.GradeComponent;

/** Tổng kết và quy đổi thang PTIT — docs/class-schedule-grades-spec.md §5.4. */
public final class GradeScale {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    public record Converted(BigDecimal total4, String letter, boolean passed) { }

    private record Band(String min, String letter, String gpa) { }

    private static final Band[] BANDS = {
            new Band("9.0", "A+", "4.0"), new Band("8.5", "A", "3.7"), new Band("8.0", "B+", "3.5"),
            new Band("7.0", "B", "3.0"), new Band("6.5", "C+", "2.5"), new Band("5.5", "C", "2.0"),
            new Band("5.0", "D+", "1.5"), new Band("4.0", "D", "1.0")};

    private GradeScale() { }

    /** Làm tròn điểm trung gian (lưu/hiển thị thành phần) 2 chữ số. */
    public static BigDecimal round2(BigDecimal value) { return value == null ? null : value.setScale(2, RoundingMode.HALF_UP); }

    /** `round(Σ trọng số × điểm / 100, 1)`; null khi thiếu thành phần nào. */
    public static BigDecimal total10(Map<GradeComponent, BigDecimal> scores, Weights weights) {
        BigDecimal sum = BigDecimal.ZERO;
        for (GradeComponent component : GradeComponent.values()) {
            BigDecimal score = scores.get(component);
            if (score == null) return null;
            sum = sum.add(score.multiply(BigDecimal.valueOf(weights.of(component))));
        }
        return sum.divide(HUNDRED, 1, RoundingMode.HALF_UP);
    }

    /** Quy đổi hệ 10 → hệ 4 và chữ; làm tròn hệ 10 một chữ số trước (8,95 → 9,0 → A+). */
    public static Converted convert(BigDecimal total10) {
        BigDecimal rounded = total10.setScale(1, RoundingMode.HALF_UP);
        for (Band band : BANDS) {
            if (rounded.compareTo(new BigDecimal(band.min())) >= 0) return new Converted(new BigDecimal(band.gpa()), band.letter(), true);
        }
        return new Converted(new BigDecimal("0.0"), "F", false);
    }
}
