package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.DomainFixtures.user;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;
import vn.lmsp.model.GradeEntry;

class GradeCalculatorTest {
    private static final AttendancePolicy DEFAULT = GradePolicyCodec.DEFAULT.attendance();
    private static final Weights WEIGHTS = GradePolicyCodec.DEFAULT.weights();

    static GradeEntry entry(GradeComponent component, String score, GradeSource source) {
        GradeEntry entry = new GradeEntry(3L, 42L, component);
        entry.record(new BigDecimal(score), source, "Phúc khảo", 7L);
        return entry;
    }

    @Test void attendanceDeductsPenaltiesAndFloorsAtZero() {
        // 15 buổi đã điểm danh: 10 có mặt, 3 muộn, 1 có phép, 1 vắng → 10 − 2 − 1,5 − 0 = 6,5
        var outcome = GradeCalculator.attendance(new AttendanceCounts(15, 10, 3, 1, 1, 0), DEFAULT, null);
        assertThat(outcome.grade().score()).isEqualByComparingTo("6.50");
        assertThat(outcome.grade().status()).isEqualTo(GradeStatus.FINAL);
        assertThat(outcome.view().max_absences()).isEqualTo(3);
        assertThat(outcome.eligible()).isTrue();

        var floored = GradeCalculator.attendance(new AttendanceCounts(30, 24, 0, 0, 6, 0),
                new AttendancePolicy(10, new BigDecimal("2"), new BigDecimal("0.5"), BigDecimal.ZERO), null);
        assertThat(floored.grade().score()).isEqualByComparingTo("0");
    }

    @Test void attendanceIsMissingWithoutRecordsAndProvisionalWhileSessionsRemain() {
        var none = GradeCalculator.attendance(new AttendanceCounts(15, 0, 0, 0, 0, 0), DEFAULT, null);
        assertThat(none.grade().score()).isNull();
        assertThat(none.grade().status()).isEqualTo(GradeStatus.MISSING);
        assertThat(GradeCalculator.attendance(null, DEFAULT, null).grade().status()).isEqualTo(GradeStatus.MISSING);

        // 15 buổi: 5 đã điểm danh, 1 đã qua chưa điểm danh, 9 chưa diễn ra
        var running = GradeCalculator.attendance(new AttendanceCounts(15, 5, 0, 0, 0, 1), DEFAULT, null);
        assertThat(running.grade().score()).isEqualByComparingTo("10");
        assertThat(running.grade().status()).isEqualTo(GradeStatus.PROVISIONAL);
    }

    @Test void tooManyAbsencesMakesStudentIneligibleAndFinalZero() {
        // max mặc định floor(20% × 15) = 3; nghỉ 2 có phép + 2 không phép = 4 > 3
        var outcome = GradeCalculator.attendance(new AttendanceCounts(15, 11, 0, 2, 2, 0), DEFAULT, null);
        assertThat(outcome.eligible()).isFalse();
        GradeRow row = GradeCalculator.row(user(42, "student"), allGraded("8"), outcome, WEIGHTS);
        assertThat(row.eligible()).isFalse();
        assertThat(row.components().get("final").score()).isEqualByComparingTo("0");
        assertThat(row.components().get("final").system_score()).isEqualByComparingTo("8");
        // 0,6 + 1,6 + 1,6 + 0 = 3,8 → F
        assertThat(row.total10()).isEqualByComparingTo("3.8");
        assertThat(row.letter()).isEqualTo("F");
        assertThat(row.passed()).isFalse();
    }

    @Test void explicitMaxAbsencesIsUsedAndAttendanceOverrideRestoresEligibility() {
        var strict = new AttendancePolicy(1, new BigDecimal("2"), new BigDecimal("0.5"), BigDecimal.ZERO);
        assertThat(GradeCalculator.attendance(new AttendanceCounts(15, 13, 0, 1, 1, 0), strict, null).eligible()).isFalse();
        var reviewed = GradeCalculator.attendance(new AttendanceCounts(15, 13, 0, 1, 1, 0), strict,
                entry(GradeComponent.ATTENDANCE, "7", GradeSource.manual));
        assertThat(reviewed.eligible()).isTrue();
        assertThat(reviewed.grade().score()).isEqualByComparingTo("7");
        assertThat(reviewed.grade().system_score()).isEqualByComparingTo("8");
    }

    @Test void overrideWinsOverSystemScore() {
        ComponentGrade grade = GradeCalculator.component(new BigDecimal("6.00"), GradeStatus.PROVISIONAL,
                entry(GradeComponent.MIDTERM, "9.5", GradeSource.csv));
        assertThat(grade.score()).isEqualByComparingTo("9.5");
        assertThat(grade.system_score()).isEqualByComparingTo("6");
        assertThat(grade.status()).isEqualTo(GradeStatus.FINAL);
        assertThat(grade.override().source()).isEqualTo(GradeSource.csv);
        assertThat(grade.override().reason()).isEqualTo("Phúc khảo");
        assertThat(GradeCalculator.component(null, GradeStatus.FINAL, null).status()).isEqualTo(GradeStatus.MISSING);
    }

    @Test void rowIsFinalOnlyWhenAllComponentsFinal() {
        var attendance = GradeCalculator.attendance(new AttendanceCounts(10, 10, 0, 0, 0, 0), DEFAULT, null);
        GradeRow row = GradeCalculator.row(user(42, "student"), allGraded("9"), attendance, WEIGHTS);
        assertThat(row.status()).isEqualTo(GradeStatus.FINAL);
        assertThat(row.total10()).isEqualByComparingTo("9.1");
        assertThat(row.letter()).isEqualTo("A+");

        Map<GradeComponent, ComponentGrade> partial = allGraded("9");
        partial.put(GradeComponent.MIDTERM, GradeCalculator.component(null, GradeStatus.FINAL, null));
        GradeRow incomplete = GradeCalculator.row(user(42, "student"), partial, attendance, WEIGHTS);
        assertThat(incomplete.status()).isEqualTo(GradeStatus.PROVISIONAL);
        assertThat(incomplete.total10()).isNull();
        assertThat(incomplete.total4()).isNull();
        assertThat(incomplete.letter()).isNull();
        assertThat(incomplete.passed()).isNull();
    }

    private static Map<GradeComponent, ComponentGrade> allGraded(String score) {
        Map<GradeComponent, ComponentGrade> grades = new EnumMap<>(GradeComponent.class);
        for (GradeComponent c : new GradeComponent[]{GradeComponent.ASSIGNMENT, GradeComponent.MIDTERM, GradeComponent.FINAL})
            grades.put(c, GradeCalculator.component(new BigDecimal(score), GradeStatus.FINAL, null));
        return grades;
    }
}
