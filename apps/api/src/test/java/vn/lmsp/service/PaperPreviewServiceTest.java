package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ExamFixtures.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.PaperPreviewDtos.*;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.*;

class PaperPreviewServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentSectionRepository sections = mock(AssignmentSectionRepository.class);
    private final AssignmentDrawRuleRepository rules = mock(AssignmentDrawRuleRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final AssessmentPaperRepository papers = mock(AssessmentPaperRepository.class);
    private final PaperItemRepository items = mock(PaperItemRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final PaperPreviewService service;

    PaperPreviewServiceTest() {
        var loader = new BlueprintLoader(sections, links, rules);
        var resolver = new PoolResolver(questions);
        service = new PaperPreviewService(access, new PaperPlanner(loader, resolver), loader,
                new BlueprintViews(loader, resolver, papers, items), papers, items,
                new PaperPreviewAssembler(questions, mock(QuestionVersionService.class)), audit);
        when(questions.findAllById(any())).thenAnswer(call -> {
            Collection<Long> ids = call.getArgument(0);
            return ids.stream().map(id -> question(id, QuestionType.mcq)).toList();
        });
    }

    private Assignment given(Assignment exam, int count, List<Long> pool) {
        var section = section(exam, 5, 1, "Phần I — Trắc nghiệm");
        when(access.lecturerAssignment(eq(50L), eq(7L), eq(false), anyBoolean())).thenReturn(exam);
        when(sections.findAllByAssignment_IdOrderByPositionAsc(50L)).thenReturn(List.of(section));
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(fixed(exam, 900, "2", 1, section, null)));
        when(rules.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(rule(exam, 1, section, null, 1, null, count, "1")));
        when(questions.findDrawCandidates(eq(20L), any(), any(), any(), anySet())).thenReturn(pool);
        return exam;
    }

    @Test void draftVariantsArePreviewedFromTheSeedWithoutErrors() {
        given(exam(PaperMode.variants, 2), 3, List.of(1L, 2L, 3L, 4L));

        PapersPreview preview = service.preview(50L, 7L, false);

        assertThat(preview.seeded()).isTrue();
        assertThat(preview.papers()).extracting(PreviewPaper::code).containsExactly("101", "102");
        assertThat(preview.papers()).allSatisfy(paper -> {
            assertThat(paper.question_count()).isEqualTo(4);
            assertThat(paper.total_points()).isEqualByComparingTo("5");
            assertThat(paper.sections()).singleElement().satisfies(section -> {
                assertThat(section.title()).isEqualTo("Phần I — Trắc nghiệm");
                assertThat(section.questions().getFirst().rule_id()).isNull();
                assertThat(section.questions().getFirst().question_id()).isEqualTo(900L);
            });
        });
        assertThat(preview.rules()).containsExactly(new RulePool(1L, 3, 4));
        assertThat(preview.variant_totals()).containsOnlyKeys("1", "2");
        assertThat(preview.warnings()).isEmpty();
        assertThat(service.preview(50L, 7L, false)).isEqualTo(preview);
    }

    @Test void shortageAndSmallPerStudentPoolBecomeWarnings() {
        given(exam(PaperMode.same, null), 3, List.of(1L, 2L));
        assertThat(service.preview(50L, 7L, false).warnings()).singleElement().asString().contains("thiếu câu");

        given(exam(PaperMode.per_student, null), 3, List.of(1L, 2L, 3L, 4L, 5L));
        PapersPreview sample = service.preview(50L, 7L, false);
        assertThat(sample.papers()).singleElement().satisfies(paper -> assertThat(paper.code()).isNull());
        assertThat(sample.warnings()).singleElement().asString().contains("dễ trùng");
    }

    @Test void reseedChangesTheSeedAndIsAudited() {
        Assignment exam = given(exam(PaperMode.same, null), 3, List.of(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L));
        long before = exam.getPaperSeed();

        service.reseed(50L, 7L, false);

        assertThat(exam.getPaperSeed()).isNotEqualTo(before);
        verify(audit).record(eq(7L), eq("assignment.reseed"), eq("assignment"), eq(50L), any(), any());
    }

    @Test void publishedAssignmentsCannotBeReseeded() {
        Assignment exam = given(exam(PaperMode.same, null), 1, List.of(1L));
        exam.publish();
        assertThatThrownBy(() -> service.reseed(50L, 7L, false)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("CONFLICT");
            assertThat(error.getStatus().value()).isEqualTo(409);
        });
        verifyNoInteractions(audit);
    }
}
