package vn.lmsp.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Thành phần điểm — docs/class-schedule-grades-spec.md §5 (`final` là từ khóa Java nên dùng giá trị chuỗi). */
public enum GradeComponent {
    ATTENDANCE("attendance"), ASSIGNMENT("assignment"), MIDTERM("midterm"), FINAL("final");

    private final String value;

    GradeComponent(String value) { this.value = value; }

    @JsonValue
    public String value() { return value; }

    @JsonCreator
    public static GradeComponent fromValue(String value) {
        for (GradeComponent component : values()) {
            if (component.value.equals(value)) return component;
        }
        throw new IllegalArgumentException("Thành phần điểm không hợp lệ: " + value);
    }
}
