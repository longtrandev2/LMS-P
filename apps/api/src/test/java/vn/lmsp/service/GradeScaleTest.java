package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import vn.lmsp.dto.GradebookDtos.Weights;
import vn.lmsp.enums.GradeComponent;

class GradeScaleTest {
    @ParameterizedTest
    @CsvSource({"10,A+,4.0", "9.0,A+,4.0", "8.95,A+,4.0", "8.94,A,3.7", "8.5,A,3.7", "8.49,A,3.7", "8.44,B+,3.5", "8.0,B+,3.5",
            "7.9,B,3.0", "7.0,B,3.0", "6.9,C+,2.5", "6.5,C+,2.5", "6.4,C,2.0", "5.5,C,2.0", "5.4,D+,1.5",
            "5.0,D+,1.5", "4.9,D,1.0", "3.95,D,1.0", "4.0,D,1.0", "3.94,F,0.0", "0,F,0.0"})
    void convertsWithOneDecimalRoundingFirst(String total10, String letter, String gpa) {
        GradeScale.Converted converted = GradeScale.convert(new BigDecimal(total10));
        assertThat(converted.letter()).isEqualTo(letter);
        assertThat(converted.total4()).isEqualByComparingTo(gpa);
        assertThat(converted.passed()).isEqualTo(!letter.equals("F"));
    }

    @Test void total10IsWeightedAndRoundedToOneDecimal() {
        Map<GradeComponent, BigDecimal> scores = new EnumMap<>(GradeComponent.class);
        scores.put(GradeComponent.ATTENDANCE, new BigDecimal("10"));
        scores.put(GradeComponent.ASSIGNMENT, new BigDecimal("8.33"));
        scores.put(GradeComponent.MIDTERM, new BigDecimal("7.5"));
        scores.put(GradeComponent.FINAL, new BigDecimal("6.25"));
        // 1.0 + 1.666 + 1.5 + 3.125 = 7.291
        assertThat(GradeScale.total10(scores, new Weights(10, 20, 20, 50))).isEqualByComparingTo("7.3");
    }

    @Test void total10IsNullWhenAComponentIsMissing() {
        Map<GradeComponent, BigDecimal> scores = new EnumMap<>(GradeComponent.class);
        scores.put(GradeComponent.ATTENDANCE, BigDecimal.TEN);
        scores.put(GradeComponent.ASSIGNMENT, BigDecimal.TEN);
        scores.put(GradeComponent.MIDTERM, BigDecimal.TEN);
        assertThat(GradeScale.total10(scores, new Weights(10, 20, 20, 50))).isNull();
    }
}
