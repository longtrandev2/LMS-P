package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;

/** Sổ điểm 4 thành phần — docs/api-spec.md §8, docs/class-schedule-grades-spec.md §5. */
public final class GradebookDtos {
    private GradebookDtos() { }

    /** Trọng số % (số nguyên, tổng 100). `final` là từ khóa Java nên đặt tên khác và ánh xạ JSON. */
    public record Weights(int attendance, int assignment, int midterm, @JsonProperty("final") int finalExam) {
        public int of(GradeComponent component) {
            return switch (component) {
                case ATTENDANCE -> attendance;
                case ASSIGNMENT -> assignment;
                case MIDTERM -> midterm;
                case FINAL -> finalExam;
            };
        }
    }

    /** `max_absences` null = floor(20% × số buổi không hủy). */
    public record AttendancePolicy(Integer max_absences, BigDecimal absent_penalty, BigDecimal late_penalty,
                                   BigDecimal excused_penalty) { }

    /** Dạng lưu ở `classes.grade_policy` và dạng trả về của API (database-design.md §2.2). */
    public record GradePolicy(Weights weights, AttendancePolicy attendance) { }

    public record WeightsInput(
            @NotNull(message = "Thiếu trọng số Chuyên cần") @DecimalMin("0") @DecimalMax("100") BigDecimal attendance,
            @NotNull(message = "Thiếu trọng số Bài tập") @DecimalMin("0") @DecimalMax("100") BigDecimal assignment,
            @NotNull(message = "Thiếu trọng số Giữa kỳ") @DecimalMin("0") @DecimalMax("100") BigDecimal midterm,
            @JsonProperty("final") @NotNull(message = "Thiếu trọng số Cuối kỳ") @DecimalMin("0") @DecimalMax("100")
            BigDecimal finalExam) { }

    public record AttendancePolicyInput(
            @Min(value = 0, message = "Số buổi nghỉ cho phép từ 0 đến 200") @Max(value = 200, message = "Số buổi nghỉ cho phép từ 0 đến 200")
            Integer max_absences,
            @NotNull @DecimalMin("0") @DecimalMax("10") BigDecimal absent_penalty,
            @NotNull @DecimalMin("0") @DecimalMax("10") BigDecimal late_penalty,
            @NotNull @DecimalMin("0") @DecimalMax("10") BigDecimal excused_penalty) { }

    public record GradePolicyInput(@NotNull @Valid WeightsInput weights, @NotNull @Valid AttendancePolicyInput attendance) { }

    public enum GradeStatus {
        FINAL("final"), PROVISIONAL("provisional"), MISSING("missing");
        private final String value;
        GradeStatus(String value) { this.value = value; }
        @JsonValue public String value() { return value; }
    }

    public record OverrideView(BigDecimal score, String reason, GradeSource source, LocalDateTime updated_at) { }

    /** `score` = điểm hiệu lực (điểm nhập nếu có, ngược lại điểm hệ thống). */
    public record ComponentGrade(BigDecimal score, BigDecimal system_score, OverrideView override, GradeStatus status) { }

    public record AttendanceView(int total, int present, int late, int excused, int absent, int unmarked, int max_absences) { }

    /** `components` có khóa `attendance|assignment|midterm|final`; `total10/total4/letter/passed` null khi thiếu thành phần. */
    public record GradeRow(Long student_id, String student_code, String full_name, Map<String, ComponentGrade> components,
                           AttendanceView attendance, boolean eligible, BigDecimal total10, BigDecimal total4,
                           String letter, Boolean passed, GradeStatus status) { }

    public record Gradebook(GradePolicy policy, List<GradeRow> items) { }

    /** `GET /me/classes/{id}/grades`: các trường của GradeRow + `policy`. */
    public record MyGrades(GradePolicy policy, @JsonUnwrapped GradeRow row) { }

    public record OverrideInput(
            @DecimalMin(value = "0", message = "Điểm phải từ 0 đến 10") @DecimalMax(value = "10", message = "Điểm phải từ 0 đến 10")
            BigDecimal score,
            @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) { }

    public record ImportRow(Integer row, String student_code, BigDecimal midterm,
                            @JsonProperty("final") BigDecimal finalExam) { }

    public record ImportInput(@NotNull @Size(min = 1, max = 500, message = "Mỗi lần nhập từ 1 đến 500 dòng") List<ImportRow> rows) { }

    public record ImportRowResult(int row, String student_code, String full_name, BigDecimal midterm,
                                  @JsonProperty("final") BigDecimal finalExam, boolean valid, String reason) { }

    public record ImportPreview(int valid_rows, List<ImportRowResult> rows) { }

    public record ImportResult(int imported, List<ImportRowResult> errors) { }
}
