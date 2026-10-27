package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ExamFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.service.PaperGenerator.Shortage;

/** Xuất bản bài giao theo phiên: bốc đề, tạo link câu bốc, ghim mọi link, lưu đề — exam-spec.md §3.6. */
class ExamPublishTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentSectionRepository sections = mock(AssignmentSectionRepository.class);
    private final AssignmentDrawRuleRepository rules = mock(AssignmentDrawRuleRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final AssessmentPaperRepository papers = mock(AssessmentPaperRepository.class);
    private final PaperItemRepository items = mock(PaperItemRepository.class);
    private final ProblemCheckGate checks = mock(ProblemCheckGate.class);
    private final AssignmentPublishService service;
    private final Map<Long, QuestionType> types = new HashMap<>();

    ExamPublishTest() {
        var snapshots = new QuestionVersionService(versions, mock(QuestionReadService.class), new ObjectMapper());
        var planner = new PaperPlanner(new BlueprintLoader(sections, links, rules), new PoolResolver(questions));
        var publisher = new PaperPublisher(planner, links, questions, new PaperStore(papers, items));
        service = new AssignmentPublishService(access, links, questions, versions, mock(QuestionBankService.class), snapshots,
                new ProgrammingProblemValidator(), checks, mock(AssignmentReadService.class), mock(AuditService.class), publisher);
        when(questions.findAllById(any())).thenAnswer(call -> {
            Collection<Long> ids = call.getArgument(0);
            return ids.stream().map(id -> question(id, types.getOrDefault(id, QuestionType.mcq))).toList();
        });
        when(questions.findByIdAndDeletedFalse(anyLong())).thenAnswer(call -> {
            long id = call.getArgument(0);
            return Optional.of(question(id, types.getOrDefault(id, QuestionType.mcq)));
        });
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(anyLong())).thenAnswer(call -> {
            long id = call.getArgument(0);
            boolean code = types.get(id) == QuestionType.programming;
            return Optional.of(version(question(id, QuestionType.mcq), 1, code ? programmingSnapshot() : mcqSnapshot("Câu " + id)));
        });
    }

    private Assignment given(Assignment exam, List<AssignmentQuestion> fixed, List<AssignmentDrawRule> drawRules, List<Long> pool) {
        when(access.lecturerAssignment(50L, 7L, false, true)).thenReturn(exam);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(fixed);
        when(rules.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(drawRules);
        when(questions.findDrawCandidates(eq(20L), any(), any(), any(), anySet())).thenReturn(pool);
        return exam;
    }

    @Test void variantsCreateDrawnLinksPinEverythingAndStoreCodedPapers() {
        var exam = exam(PaperMode.variants, 2);
        var fixed = fixed(exam, 900, "4", 1, null, null);
        given(exam, List.of(fixed), List.of(rule(exam, 1, null, null, 1, null, 2, "3")), List.of(101L, 102L, 103L, 104L));

        service.publish(50L, 7L, false, false);

        var drawn = ArgumentCaptor.forClass(AssignmentQuestion.class);
        verify(links, times(4)).save(drawn.capture());
        assertThat(drawn.getAllValues()).extracting(AssignmentQuestion::getQuestionId).containsExactlyInAnyOrder(101L, 102L, 103L, 104L);
        assertThat(drawn.getAllValues()).allSatisfy(link -> {
            assertThat(link.getDrawRuleId()).isEqualTo(1L);
            assertThat(link.getPoints()).isEqualByComparingTo("3");
            assertThat(link.getQuestionVersion()).isNotNull();
            assertThat(link.getPosition()).isGreaterThan(1);
        });
        assertThat(fixed.getQuestionVersion()).isNotNull();
        var stored = ArgumentCaptor.forClass(AssessmentPaper.class);
        verify(papers, times(2)).save(stored.capture());
        assertThat(stored.getAllValues()).extracting(AssessmentPaper::getCode).containsExactly("101", "102");
        assertThat(stored.getAllValues()).allSatisfy(paper -> assertThat(paper.getTotalPoints()).isEqualByComparingTo("10"));
        var rows = ArgumentCaptor.forClass(PaperItem.class);
        verify(items, times(6)).save(rows.capture());
        assertThat(rows.getAllValues().getFirst().getAssignmentQuestion()).isSameAs(fixed);
        assertThat(exam.isPublished()).isTrue();
    }

    @Test void shortageBlocksPublishingWithDetails() {
        var exam = exam(PaperMode.same, null);
        given(exam, List.of(), List.of(rule(exam, 8, null, null, 1, null, 3, "1")), List.of(1L, 2L));

        assertThatThrownBy(() -> service.publish(50L, 7L, false, false)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(error.getDetails()).isEqualTo(Map.of("shortages", List.of(new Shortage(8L, 3, 2))));
        });
        assertThat(exam.isPublished()).isFalse();
        verify(papers, never()).save(any());
    }

    @Test void handMadeVariantsMustHaveEqualTotals() {
        var exam = exam(PaperMode.variants, 2);
        given(exam, List.of(fixed(exam, 1, "10", 1, null, 1), fixed(exam, 2, "9.5", 2, null, 2)), List.of(), List.of());

        assertThatThrownBy(() -> service.publish(50L, 7L, false, false)).isInstanceOfSatisfying(LmsException.class, error -> {
            @SuppressWarnings("unchecked") var totals = (Map<String, BigDecimal>) ((Map<String, Object>) error.getDetails()).get("variant_totals");
            assertThat(totals.get("1")).isEqualByComparingTo("10");
            assertThat(totals.get("2")).isEqualByComparingTo("9.5");
        });
        assertThat(exam.isPublished()).isFalse();
    }

    @Test void perStudentPinsTheWholePoolAndStoresNoPaper() {
        var exam = exam(PaperMode.per_student, null);
        given(exam, List.of(), List.of(rule(exam, 1, null, null, 1, null, 2, "5")), List.of(1L, 2L, 3L, 4L, 5L));

        service.publish(50L, 7L, false, false);

        verify(links, times(5)).save(any());
        verify(papers, never()).save(any());
        assertThat(exam.isPublished()).isTrue();
    }

    @Test void drawnProgrammingQuestionsGoThroughTheProblemCheckGate() {
        var exam = exam(PaperMode.same, null);
        types.put(100L, QuestionType.programming);
        given(exam, List.of(), List.of(rule(exam, 1, null, null, 1, QuestionType.programming, 1, "10")), List.of(100L));
        when(checks.status(1001L)).thenReturn(ProblemCheckGate.Status.UNVERIFIED);

        assertThatThrownBy(() -> service.publish(50L, 7L, false, false)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("PROBLEM_UNVERIFIED");
            assertThat(error.getDetails()).isEqualTo(Map.of("question_ids", List.of(100L)));
        });
        assertThat(exam.isPublished()).isFalse();
    }

    @Test void moreThanFiveHundredPinnedQuestionsAreRejected() {
        var exam = exam(PaperMode.per_student, null);
        List<Long> pool = new ArrayList<>();
        for (long id = 1; id <= 501; id++) pool.add(id);
        given(exam, List.of(), List.of(rule(exam, 1, null, null, 1, null, 2, "1")), pool);

        assertThatThrownBy(() -> service.publish(50L, 7L, false, false)).hasMessageContaining("500");
    }
}
