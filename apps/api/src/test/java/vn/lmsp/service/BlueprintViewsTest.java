package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ExamFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.AssessmentPaper;
import vn.lmsp.repository.*;

/** Số câu/tổng điểm mô tả một đề; sinh viên không nhận đề của bài giao theo phiên — exam-spec.md §5.3. */
class BlueprintViewsTest {
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentSectionRepository sections = mock(AssignmentSectionRepository.class);
    private final AssignmentDrawRuleRepository rules = mock(AssignmentDrawRuleRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final AssessmentPaperRepository papers = mock(AssessmentPaperRepository.class);
    private final PaperItemRepository items = mock(PaperItemRepository.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final BlueprintViews views = new BlueprintViews(new BlueprintLoader(sections, links, rules),
            new PoolResolver(questions), papers, items);
    private final AssignmentReadService reader = new AssignmentReadService(links, versions,
            new QuestionVersionService(versions, mock(QuestionReadService.class), new ObjectMapper()),
            new AssignmentMapper(), new QuestionPaperMapper(), views);

    @Test void draftCountsCommonItemsPlusVariantOne() {
        var exam = exam(PaperMode.variants, 2);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(fixed(exam, 1, "2", 1, null, null),
                fixed(exam, 2, "3", 2, null, 1), fixed(exam, 3, "3", 3, null, 2)));
        when(rules.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(rule(exam, 1, null, null, 1, null, 4, "0.5"),
                rule(exam, 2, null, 2, 2, null, 6, "0.5")));
        when(questions.findDrawCandidates(eq(20L), any(), any(), any(), anySet())).thenReturn(List.of(10L, 11L, 12L, 13L, 14L));

        var metrics = views.metrics(exam);
        assertThat(metrics.questionCount()).isEqualTo(6);
        assertThat(metrics.totalPoints()).isEqualByComparingTo("7");

        var blueprint = views.views(exam);
        assertThat(blueprint.drawRules()).extracting(rule -> rule.pool_size()).containsExactly(5, 0);
        assertThat(blueprint.placements()).extracting(placement -> placement.variant_no()).containsExactly(null, 1, 2);
    }

    @Test void publishedSharedPaperDescribesTheFirstStoredPaper() {
        var exam = exam(PaperMode.variants, 2);
        exam.publish();
        var first = identified(new AssessmentPaper(exam, "101", null, new BigDecimal("8.5")), 3L);
        when(papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(50L)).thenReturn(List.of(first));
        when(items.countByPaper_Id(3L)).thenReturn(12L);

        var summary = reader.summary(exam);
        assertThat(summary.question_count()).isEqualTo(12);
        assertThat(summary.total_points()).isEqualByComparingTo("8.5");
        assertThat(summary.delivery()).isEqualTo("session");
    }

    @Test void studentsGetNoQuestionsForSessionBasedAssignments() {
        var exam = exam(PaperMode.same, null);
        exam.publish();
        var link = fixed(exam, 1, "5", 1, null, null);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));

        var details = reader.studentDetails(exam, 42L, 1);

        assertThat(details.questions()).isEmpty();
        assertThat(details.sections()).isEmpty();
        assertThat(details.draw_rules()).isEmpty();
        assertThat(details.assignment().question_count()).isEqualTo(1);
        assertThat(details.assignment().total_points()).isEqualByComparingTo("5");
        verifyNoInteractions(versions);
    }
}
