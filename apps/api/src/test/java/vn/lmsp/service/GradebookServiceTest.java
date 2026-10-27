package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.service.AssignmentScoreCollector.CategoryScores;

class GradebookServiceTest {
    private final GradebookAccess access = mock(GradebookAccess.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final GradeEntryRepository entries = mock(GradeEntryRepository.class);
    private final AttendanceSummaryProvider attendance = mock(AttendanceSummaryProvider.class);
    private final AssignmentScoreCollector collector = mock(AssignmentScoreCollector.class);
    private final GradebookService service = new GradebookService(access, enrollments, users, entries, attendance, collector,
            vn.lmsp.support.TestSettings.defaults());
    private final LmsClass clazz = clazz(null);
    private final User first = user(42, "student"), second = user(43, "student");

    @BeforeEach void setup() {
        when(access.lecturerClass(3L, 7L, false)).thenReturn(clazz);
        when(access.studentClass(3L, 43L)).thenReturn(clazz);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active)).thenReturn(List.of(
                new Enrollment(clazz, second, EnrollmentVia.lecturer), new Enrollment(clazz, first, EnrollmentVia.lecturer)));
        when(users.findAllById(anyIterable())).thenReturn(List.of(second, first));
        when(attendance.countsByStudent(3L)).thenReturn(Map.of(
                42L, new AttendanceCounts(10, 8, 2, 0, 0, 0), 43L, new AttendanceCounts(10, 6, 0, 1, 3, 0)));
        Map<GradeComponent, CategoryScores> scores = new EnumMap<>(GradeComponent.class);
        scores.put(GradeComponent.ASSIGNMENT, new CategoryScores(2, 0, Map.of(42L, new BigDecimal("16"), 43L, new BigDecimal("12")), Set.of()));
        scores.put(GradeComponent.FINAL, new CategoryScores(1, 0, Map.of(42L, new BigDecimal("8")), Set.of(43L)));
        when(collector.collect(eq(clazz), any())).thenReturn(scores);
        GradeEntry midterm = new GradeEntry(3L, 42L, GradeComponent.MIDTERM);
        midterm.record(new BigDecimal("7.00"), GradeSource.csv, null, 7L);
        when(entries.findAllByClassId(3L)).thenReturn(List.of(midterm));
    }

    @Test void gradebookCombinesSourcesPerStudentWithFixedQueries() {
        Gradebook book = service.gradebook(3L, 7L, false);

        assertThat(book.policy()).isEqualTo(GradePolicyCodec.DEFAULT);
        assertThat(book.items()).extracting(GradeRow::student_code).containsExactly("SV42", "SV43");
        GradeRow mine = book.items().getFirst();
        // Chuyên cần: 10 − 2 × 0,5 = 9; Bài tập 16/2 = 8; Giữa kỳ CSV 7; Cuối kỳ 8 → 0,9 + 1,6 + 1,4 + 4 = 7,9
        assertThat(mine.components().get("attendance").score()).isEqualByComparingTo("9");
        assertThat(mine.components().get("assignment").score()).isEqualByComparingTo("8");
        assertThat(mine.components().get("midterm").override().source()).isEqualTo(GradeSource.csv);
        assertThat(mine.total10()).isEqualByComparingTo("7.9");
        assertThat(mine.letter()).isEqualTo("B");
        assertThat(mine.status()).isEqualTo(GradeStatus.FINAL);

        GradeRow other = book.items().get(1);
        assertThat(other.components().get("midterm").status()).isEqualTo(GradeStatus.MISSING);
        assertThat(other.eligible()).isFalse(); // 4 buổi nghỉ > floor(20% × 10) = 2
        assertThat(other.components().get("final").score()).isEqualByComparingTo("0");
        assertThat(other.total10()).isNull();
        assertThat(other.status()).isEqualTo(GradeStatus.PROVISIONAL);
        verify(attendance, times(1)).countsByStudent(3L);
        verify(entries, times(1)).findAllByClassId(3L);
        verify(users, times(1)).findAllById(anyIterable());
        verify(collector, times(1)).collect(eq(clazz), any());
    }

    @Test void studentSeesOnlyOwnRowWithPolicy() throws Exception {
        MyGrades grades = service.mine(3L, 43L);

        assertThat(grades.row().student_id()).isEqualTo(43L);
        var tree = new ObjectMapper().findAndRegisterModules().valueToTree(grades);
        assertThat(tree.has("policy")).isTrue();
        assertThat(tree.path("student_id").asLong()).isEqualTo(43L);
        assertThat(tree.has("row")).isFalse();
        assertThat(tree.path("components").has("final")).isTrue();
        assertThat(tree.path("policy").path("weights").path("final").asInt()).isEqualTo(50);
    }

    @Test void rowForStudentOutsideClassIsNotFound() {
        assertThatThrownBy(() -> service.row(clazz, 99L)).extracting("code").isEqualTo("NOT_FOUND");
    }
}
