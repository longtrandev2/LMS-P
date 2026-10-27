package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.assignment;
import static vn.lmsp.support.ExamFixtures.*;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.repository.QuestionRepository;

class PoolResolverTest {
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final PoolResolver resolver = new PoolResolver(questions);

    @Test void poolsArePartitionedBySectionThenRulePositionMinusFixedQuestions() {
        var exam = exam(PaperMode.variants, 2);
        var first = section(exam, 1, 1, "Phần I");
        var second = section(exam, 2, 2, "Phần II");
        var inSecond = rule(exam, 11, second, null, 1, null, 2, "1");
        var inFirst = rule(exam, 12, first, 2, 2, QuestionType.mcq, 2, "1");
        var noSection = rule(exam, 13, null, null, 3, null, 1, "1");
        when(questions.findDrawCandidates(20L, null, null, null, Set.of())).thenReturn(List.of(6L, 5L, 4L, 3L, 2L, 1L));
        when(questions.findDrawCandidates(20L, null, QuestionType.mcq, null, Set.of())).thenReturn(List.of(4L, 3L, 2L, 1L));

        var ordered = BlueprintLoader.partitionOrder(List.of(inSecond, inFirst, noSection));
        assertThat(ordered).containsExactly(noSection, inFirst, inSecond);
        var pools = resolver.resolve(exam, ordered, List.of(2L));

        assertThat(pools.get(13L)).containsExactly(1L, 3L, 4L, 5L, 6L);
        assertThat(pools.get(12L)).isEmpty();
        assertThat(pools.get(11L)).isEmpty();
    }

    @Test void laterRulesOnlyGetQuestionsNotTakenByEarlierRules() {
        var exam = exam(PaperMode.same, null);
        var mcqRule = rule(exam, 1, null, null, 1, QuestionType.mcq, 1, "1");
        var anyRule = rule(exam, 2, null, null, 2, null, 1, "1");
        when(questions.findDrawCandidates(20L, null, QuestionType.mcq, null, Set.of())).thenReturn(List.of(3L, 1L));
        when(questions.findDrawCandidates(20L, null, null, null, Set.of())).thenReturn(List.of(1L, 2L, 3L, 4L));

        var pools = resolver.resolve(exam, List.of(mcqRule, anyRule), List.of());

        assertThat(pools.get(1L)).containsExactly(1L, 3L);
        assertThat(pools.get(2L)).containsExactly(2L, 4L);
    }

    @Test void quizAlwaysExcludesProgrammingQuestions() {
        var quiz = assignment(AssignmentCategory.QUIZ);
        var anyType = rule(quiz, 1, null, null, 1, null, 1, "1");
        var programming = rule(quiz, 2, null, null, 2, QuestionType.programming, 1, "1");
        when(questions.findDrawCandidates(20L, null, null, null, Set.of(QuestionType.programming))).thenReturn(List.of(7L));

        var pools = resolver.resolve(quiz, List.of(anyType, programming), List.of());

        assertThat(pools.get(1L)).containsExactly(7L);
        assertThat(pools.get(2L)).isEmpty();
        verify(questions, never()).findDrawCandidates(anyLong(), any(), eq(QuestionType.programming), any(), anySet());
    }
}
