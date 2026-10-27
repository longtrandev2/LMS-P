package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.ReviewDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.AssignmentRepository;

class AssignmentScoreCollectorTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 27, 12, 0);
    private final AssignmentRepository assignments = mock(AssignmentRepository.class);
    private final AssignmentResultService results = mock(AssignmentResultService.class);
    private final AssignmentScoreCollector collector = new AssignmentScoreCollector(assignments, results);
    private final LmsClass clazz = clazz(null);

    static Assignment assignment(long id, AssignmentCategory category, LocalDateTime due) {
        Assignment item = identified(new Assignment(clazz(null), "Bài " + id, null, category, null, due, false, null,
                0, null, ScorePolicy.best, user(7, "lecturer")), id);
        item.publish();
        return item;
    }

    static StudentResult result(long studentId, String score, String max, SubmissionStatus lastStatus) {
        return new StudentResult(studentId, "SV " + studentId, "SV" + studentId, score == null ? null : new BigDecimal(score),
                new BigDecimal(max), 1, null, List.of(new QuestionResult(1L, null, 1, lastStatus, null)));
    }

    @Test void averagesClosedAssignmentsOnTenPointScaleWithMissingSubmissionAsZero() {
        Assignment quiz = assignment(1, AssignmentCategory.QUIZ, NOW.minusDays(2));
        Assignment homework = assignment(2, AssignmentCategory.ASSIGNMENT, NOW.minusDays(1));
        Assignment open = assignment(3, AssignmentCategory.ASSIGNMENT, NOW.plusDays(1));
        Assignment midterm = assignment(4, AssignmentCategory.MIDTERM, NOW.minusHours(1));
        when(assignments.findAllByLmsClass_IdAndPublishedTrueOrderByDueAtAscIdAsc(3L)).thenReturn(List.of(quiz, homework, open, midterm));
        when(results.results(1L, 7L, true)).thenReturn(new ResultsTable(List.of(
                result(42, "8", "10", SubmissionStatus.completed), result(43, null, "10", null))));
        when(results.results(2L, 7L, true)).thenReturn(new ResultsTable(List.of(
                result(42, "15", "20", SubmissionStatus.completed), result(43, "20", "20", SubmissionStatus.grading))));
        when(results.results(4L, 7L, true)).thenReturn(new ResultsTable(List.of(
                result(42, "7", "10", SubmissionStatus.completed), result(43, "3", "4", SubmissionStatus.completed))));

        var scores = collector.collect(clazz, NOW);

        var homeworkScores = scores.get(GradeComponent.ASSIGNMENT);
        assertThat(homeworkScores.closed()).isEqualTo(2);
        assertThat(homeworkScores.open()).isEqualTo(1);
        assertThat(homeworkScores.average(42L)).isEqualByComparingTo("7.75"); // (8 + 7,5) / 2
        assertThat(homeworkScores.average(43L)).isEqualByComparingTo("5.00"); // (0 + 10) / 2
        assertThat(homeworkScores.average(99L)).isEqualByComparingTo("0");
        assertThat(homeworkScores.provisional(42L)).isTrue(); // còn bài mở
        assertThat(homeworkScores.pending()).containsExactly(43L);
        var midtermScores = scores.get(GradeComponent.MIDTERM);
        assertThat(midtermScores.average(43L)).isEqualByComparingTo("7.50");
        assertThat(midtermScores.provisional(42L)).isFalse();
        assertThat(scores.get(GradeComponent.FINAL)).isNull();
        verify(results, never()).results(3L, 7L, true);
    }

    @Test void lateWindowKeepsAssignmentOpenUntilLateDue() {
        Assignment late = assignment(5, AssignmentCategory.ASSIGNMENT, NOW.minusDays(1));
        late.update("Bài", null, AssignmentCategory.ASSIGNMENT, null, NOW.minusDays(1), true, NOW.plusDays(1), 10, null, ScorePolicy.best);
        when(assignments.findAllByLmsClass_IdAndPublishedTrueOrderByDueAtAscIdAsc(3L)).thenReturn(List.of(late));

        var scores = collector.collect(clazz, NOW).get(GradeComponent.ASSIGNMENT);

        assertThat(scores.closed()).isZero();
        assertThat(scores.average(42L)).isNull();
        verifyNoInteractions(results);
    }
}
