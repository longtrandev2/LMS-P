package vn.lmsp.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AssignmentCategory {
    QUIZ("quiz"), ASSIGNMENT("assignment"), MIDTERM("midterm"), FINAL("final");

    private final String value;

    AssignmentCategory(String value) { this.value = value; }

    @JsonValue
    public String value() { return value; }

    @JsonCreator
    public static AssignmentCategory fromValue(String value) {
        for (AssignmentCategory category : values()) {
            if (category.value.equals(value)) return category;
        }
        throw new IllegalArgumentException("Hạng mục bài tập không hợp lệ: " + value);
    }
}
