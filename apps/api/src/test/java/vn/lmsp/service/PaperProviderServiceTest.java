package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ExamFixtures.*;

import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class PaperProviderServiceTest {
    private final AssessmentPaperRepository papers = mock(AssessmentPaperRepository.class);
    private final PaperItemRepository items = mock(PaperItemRepository.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentSectionRepository sections = mock(AssignmentSectionRepository.class);
    private final AssignmentDrawRuleRepository rules = mock(AssignmentDrawRuleRepository.class);
    private final BlueprintLoader loader = new BlueprintLoader(sections, links, rules);
    private final PaperProviderService provider = new PaperProviderService(papers, items, loader, sections,
            new PaperPlanner(loader, new PoolResolver(mock(QuestionRepository.class))), new PaperStore(papers, items));

    private AssessmentPaper paper(Assignment exam, long id, String code) {
        return identified(new AssessmentPaper(exam, code, null, BigDecimal.TEN), id);
    }

    @Test void variantsGoToThePaperWithFewestSessions() {
        var exam = exam(PaperMode.variants, 3);
        exam.publish();
        when(papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(50L))
                .thenReturn(List.of(paper(exam, 1, "101"), paper(exam, 2, "102"), paper(exam, 3, "103")));
        when(papers.countSessionsByPaper(50L)).thenReturn(List.of(new Object[]{1L, 2L}, new Object[]{2L, 1L}));

        assertThat(provider.paperForNewSession(exam, user(42, "student"), 1).getCode()).isEqualTo("103");
    }

    @Test void tiesAreBrokenByStudentSeedStablyAndSpreadAcrossPapers() {
        var exam = exam(PaperMode.variants, 2);
        exam.publish();
        when(papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(50L))
                .thenReturn(List.of(paper(exam, 1, "101"), paper(exam, 2, "102")));
        when(papers.countSessionsByPaper(50L)).thenReturn(List.of(new Object[]{1L, 3L}, new Object[]{2L, 3L}));

        Set<String> codes = new HashSet<>();
        for (long student = 1; student <= 12; student++) {
            String code = provider.paperForNewSession(exam, user(student, "student"), 1).getCode();
            assertThat(provider.paperForNewSession(exam, user(student, "student"), 1).getCode()).isEqualTo(code);
            codes.add(code);
        }
        assertThat(codes).containsExactlyInAnyOrder("101", "102");
        verify(papers, never()).save(any());
    }

    @Test void perStudentDrawsFromPinnedPoolDeterministicallyAndStoresThePaper() {
        var exam = exam(PaperMode.per_student, null);
        var rule = rule(exam, 1, null, null, 1, null, 3, "2");
        List<AssignmentQuestion> all = new ArrayList<>(List.of(fixed(exam, 900, "4", 1, null, null)));
        for (long id = 1; id <= 8; id++)
            all.add(AssignmentQuestion.drawn(exam, question(id, QuestionType.mcq), rule, (int) id + 1));
        exam.publish();
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(all);
        when(rules.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(rule));

        List<Long> first = drawnFor(exam, 42L, 1);
        assertThat(drawnFor(exam, 42L, 1)).isEqualTo(first);
        assertThat(first).hasSize(4).startsWith(900L).doesNotHaveDuplicates();
        Set<List<Long>> seen = new HashSet<>();
        for (int attempt = 1; attempt <= 6; attempt++) seen.add(drawnFor(exam, 42L, attempt));
        assertThat(seen).hasSizeGreaterThan(1);

        var stored = ArgumentCaptor.forClass(AssessmentPaper.class);
        verify(papers, atLeastOnce()).save(stored.capture());
        assertThat(stored.getValue().getStudent().getId()).isEqualTo(42L);
        assertThat(stored.getValue().getTotalPoints()).isEqualByComparingTo("10");
        assertThat(provider.maxScore(exam)).isEqualByComparingTo("10");
    }

    @Test void sameWithoutPaperRowsUsesAllLinksForMaxScore() {
        var exam = exam(PaperMode.same, null);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L))
                .thenReturn(List.of(fixed(exam, 1, "2.5", 1, null, null), fixed(exam, 2, "1.5", 2, null, null)));
        assertThat(provider.maxScore(exam)).isEqualByComparingTo("4");
    }

    private List<Long> drawnFor(Assignment exam, long student, int attempt) {
        clearInvocations(items);
        provider.paperForNewSession(exam, user(student, "student"), attempt);
        var rows = ArgumentCaptor.forClass(PaperItem.class);
        verify(items, atLeastOnce()).save(rows.capture());
        return rows.getAllValues().stream().map(item -> item.getAssignmentQuestion().getQuestionId()).toList();
    }
}
