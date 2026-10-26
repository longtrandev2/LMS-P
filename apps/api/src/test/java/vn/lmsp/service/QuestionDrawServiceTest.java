package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDrawDtos.*;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.QuestionMapper;
import vn.lmsp.model.Question;
import vn.lmsp.repository.QuestionRepository;
import vn.lmsp.repository.QuestionVersionRepository;

class QuestionDrawServiceTest {
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final QuestionBankService banks = mock(QuestionBankService.class);
    private final QuestionReadService reader = new QuestionReadService(null, null, null,
            mock(QuestionVersionRepository.class), new QuestionMapper());
    private final QuestionDrawService service = new QuestionDrawService(questions, banks, reader);

    QuestionDrawServiceTest() {
        when(questions.findAllById(any())).thenAnswer(call -> {
            Collection<Long> ids = call.getArgument(0);
            return ids.stream().map(id -> question(id, QuestionType.mcq)).toList();
        });
    }

    @Test void drawsWithoutRepeatsAcrossRulesSkipsExcludedAndReportsShortages() {
        when(questions.findDrawCandidates(20L, null, null, null, Set.of())).thenReturn(List.of(1L, 2L, 3L, 4L));
        when(questions.findDrawCandidates(20L, null, QuestionType.mcq, QuestionDifficulty.easy, Set.of())).thenReturn(List.of(1L, 2L, 3L));
        var request = new DrawRequest(List.of(new DrawRule(20L, null, null, null, 2),
                new DrawRule(20L, null, QuestionDifficulty.easy, QuestionType.mcq, 3)), List.of(4L), null);

        DrawResult result = service.draw(request, 7L, false);

        var ids = result.items().stream().map(item -> item.id()).toList();
        assertThat(ids).doesNotHaveDuplicates().doesNotContain(4L).hasSize(3);
        assertThat(result.shortages()).containsExactly(new DrawShortage(1, 3, 1));
        verify(banks, times(2)).requireBank(20L, 7L, false);
    }

    @Test void bankWithoutViewPermissionIsRejected() {
        when(banks.requireBank(99L, 7L, false)).thenThrow(new LmsException("FORBIDDEN", "Không có quyền", HttpStatus.FORBIDDEN, null));
        var request = new DrawRequest(List.of(new DrawRule(99L, null, null, null, 1)), null, null);

        assertThatThrownBy(() -> service.draw(request, 7L, false)).isInstanceOf(LmsException.class);
        verify(questions, never()).findDrawCandidates(anyLong(), any(), any(), any(), anySet());
    }

    @Test void categoryMustBelongToRuleBank() {
        Question other = question(5, QuestionType.mcq);
        when(banks.requireCategory(30L, 7L, false)).thenReturn(other.getCategory());
        var request = new DrawRequest(List.of(new DrawRule(21L, 30L, null, null, 1)), null, null);

        assertThatThrownBy(() -> service.draw(request, 7L, false)).hasMessageContaining("Danh mục");
    }

    @Test void excludedTypesApplyToEveryRuleIncludingTypedRules() {
        when(questions.findDrawCandidates(20L, null, null, null, Set.of(QuestionType.programming))).thenReturn(List.of(1L));
        var request = new DrawRequest(List.of(new DrawRule(20L, null, null, null, 1),
                new DrawRule(20L, null, null, QuestionType.programming, 2)), null, List.of(QuestionType.programming));

        DrawResult result = service.draw(request, 7L, false);

        assertThat(result.items()).extracting(item -> item.id()).containsExactly(1L);
        assertThat(result.shortages()).containsExactly(new DrawShortage(1, 2, 0));
        verify(questions, never()).findDrawCandidates(eq(20L), any(), eq(QuestionType.programming), any(), anySet());
    }
}
