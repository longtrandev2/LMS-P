package vn.lmsp.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import vn.lmsp.dto.GradebookDtos.AttendancePolicy;
import vn.lmsp.dto.GradebookDtos.GradePolicy;
import vn.lmsp.dto.GradebookDtos.Weights;

/**
 * Đọc `classes.grade_policy` (database-design.md §2.2). NULL hoặc thiếu khóa → giá trị mặc định
 * của class-schedule-grades-spec.md §5.1, §5.3 (10/20/20/50; trừ 2 / 0,5 / 0; max_absences theo 20%).
 */
public final class GradePolicyCodec {
    public static final GradePolicy DEFAULT = new GradePolicy(new Weights(10, 20, 20, 50),
            new AttendancePolicy(null, new BigDecimal("2"), new BigDecimal("0.5"), BigDecimal.ZERO));

    private GradePolicyCodec() { }

    public static GradePolicy read(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) return DEFAULT;
        JsonNode weights = node.path("weights"), attendance = node.path("attendance");
        Weights fallback = DEFAULT.weights();
        AttendancePolicy base = DEFAULT.attendance();
        return new GradePolicy(
                new Weights(integer(weights, "attendance", fallback.attendance()), integer(weights, "assignment", fallback.assignment()),
                        integer(weights, "midterm", fallback.midterm()), integer(weights, "final", fallback.finalExam())),
                new AttendancePolicy(attendance.path("max_absences").isNumber() ? attendance.path("max_absences").intValue() : null,
                        decimal(attendance, "absent_penalty", base.absent_penalty()),
                        decimal(attendance, "late_penalty", base.late_penalty()),
                        decimal(attendance, "excused_penalty", base.excused_penalty())));
    }

    /** Bỏ số 0 thừa nhưng giữ dạng thường (10 chứ không phải 1E+1). */
    public static BigDecimal plain(BigDecimal value) { return new BigDecimal(value.stripTrailingZeros().toPlainString()); }

    private static int integer(JsonNode parent, String key, int fallback) {
        JsonNode value = parent.path(key);
        return value.isNumber() ? value.intValue() : fallback;
    }

    private static BigDecimal decimal(JsonNode parent, String key, BigDecimal fallback) {
        JsonNode value = parent.path(key);
        return value.isNumber() ? plain(value.decimalValue()) : fallback;
    }
}
