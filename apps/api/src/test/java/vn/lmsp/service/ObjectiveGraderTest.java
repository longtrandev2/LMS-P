package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.AssessmentFixtures.*;
import static vn.lmsp.support.DomainFixtures.mcqSnapshot;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.ScoringMode;

class ObjectiveGraderTest {
    private final AnswerNormalizer normalizer = new AnswerNormalizer();
    private final ObjectiveGrader grader = new ObjectiveGrader();

    private BigDecimal grade(QuestionSnapshot snapshot, AnswerInput answer) {
        return grader.fraction(snapshot, normalizer.normalize(snapshot, answer));
    }

    private AnswerInput text(String value) { return new AnswerInput(1L, null, value, null, null, null, null); }
    private AnswerInput number(String value) { return new AnswerInput(1L, null, null, new BigDecimal(value), null, null, null); }
    private AnswerInput blanks(String... values) { return new AnswerInput(1L, null, null, null, List.of(values), null, null); }
    private AnswerInput matches(Map<String, String> values) { return new AnswerInput(1L, null, null, null, null, values, null); }
    private AnswerInput order(String... ids) { return new AnswerInput(1L, null, null, null, null, null, List.of(ids)); }

    @Test void singleChoiceNeedsTheCorrectOption() {
        assertThat(grade(mcqSnapshot("Câu"), choose(1L, 11L))).isEqualByComparingTo("1");
        assertThat(grade(mcqSnapshot("Câu"), choose(1L, 12L))).isEqualByComparingTo("0");
        assertThat(grade(mcqSnapshot("Câu"), answer(1L))).isEqualByComparingTo("0");
    }

    @Test void multipleChoiceAllOrNothingAndMoodlePartial() {
        var strict = multipleChoice(ScoringMode.all_or_nothing);
        assertThat(grade(strict, choose(1L, 11L, 12L))).isEqualByComparingTo("1");
        assertThat(grade(strict, choose(1L, 11L))).isEqualByComparingTo("0");
        var partial = multipleChoice(ScoringMode.partial);
        assertThat(grade(partial, choose(1L, 11L))).isEqualByComparingTo("0.5");
        assertThat(grade(partial, choose(1L, 11L, 12L, 13L))).isEqualByComparingTo("0.5");
        assertThat(grade(partial, choose(1L, 11L, 13L, 14L))).isEqualByComparingTo("0");
    }

    @Test void partialScoreIsRoundedAfterLatePenalty() {
        assertThat(grader.score(new BigDecimal("3"), new BigDecimal("0.5"), 20)).isEqualByComparingTo("1.20");
        assertThat(grader.score(new BigDecimal("1"), BigDecimal.ONE.divide(new BigDecimal("3"), java.math.MathContext.DECIMAL64), 0))
                .isEqualByComparingTo("0.33");
    }

    @Test void shortAnswerMatchesAfterNormalizationWithoutDroppingDiacritics() {
        assertThat(grade(shortAnswer(), text("  transmission   control\tprotocol "))).isEqualByComparingTo("1");
        assertThat(grade(shortAnswer(), text("UDP"))).isEqualByComparingTo("0");
        assertThat(AnswerText.matchesAny("Việt  Nam", List.of("việt nam"), false)).isTrue();
        assertThat(AnswerText.matchesAny("Viet Nam", List.of("việt nam"), false)).isFalse();
        assertThat(AnswerText.matchesAny("Tcp", List.of("TCP"), true)).isFalse();
        String decomposed = "Việt";
        assertThat(AnswerText.normalize(decomposed)).isEqualTo("Việt");
    }

    @Test void numericUsesTolerance() {
        assertThat(grade(numeric(), number("80.5"))).isEqualByComparingTo("1");
        assertThat(grade(numeric(), number("79.4"))).isEqualByComparingTo("0");
    }

    @Test void fillBlankScoresEachBlankAndHonoursCaseSensitivity() {
        assertThat(grade(fillBlank(ScoringMode.partial), blanks(" LISTEN ", "accept"))).isEqualByComparingTo("1");
        assertThat(grade(fillBlank(ScoringMode.partial), blanks("listen", "ACCEPT"))).isEqualByComparingTo("0.5");
        assertThat(grade(fillBlank(ScoringMode.all_or_nothing), blanks("listen", ""))).isEqualByComparingTo("0");
        assertThatThrownBy(() -> grade(fillBlank(ScoringMode.partial), blanks("listen"))).hasMessageContaining("2 ô");
    }

    @Test void matchingAndOrderingScoreByIdNotDisplayOrder() {
        var answer = Map.of("aaaaaaa1", "bbbbbbb1", "aaaaaaa2", "ddddddd1", "aaaaaaa3", "bbbbbbb3");
        assertThat(grade(matching(ScoringMode.partial), matches(answer))).isEqualByComparingTo(new BigDecimal(2).divide(new BigDecimal(3), java.math.MathContext.DECIMAL64));
        assertThat(grade(matching(ScoringMode.all_or_nothing), matches(answer))).isEqualByComparingTo("0");
        assertThat(grade(ordering(ScoringMode.partial), order("ccccccc1", "ccccccc2", "ccccccc4", "ccccccc3"))).isEqualByComparingTo("0.5");
        assertThat(grade(ordering(ScoringMode.all_or_nothing), order("ccccccc1", "ccccccc2", "ccccccc3", "ccccccc4"))).isEqualByComparingTo("1");
        assertThatThrownBy(() -> grade(ordering(ScoringMode.partial), order("ccccccc1", "ccccccc1", "ccccccc3", "ccccccc4")))
                .hasMessageContaining("hoán vị");
        assertThatThrownBy(() -> grade(matching(ScoringMode.partial), matches(Map.of("zzzzzzzz", "bbbbbbb1"))))
                .hasMessageContaining("không thuộc");
    }

    @Test void fieldsOfAnotherTypeAndForeignOptionsAreRejected() {
        assertThatThrownBy(() -> grade(shortAnswer(), new AnswerInput(1L, List.of(11L), "TCP", null, null, null, null)))
                .hasMessageContaining("không thuộc loại");
        assertThatThrownBy(() -> grade(mcqSnapshot("Câu"), choose(1L, 11L, 12L))).hasMessageContaining("một lựa chọn");
        assertThatThrownBy(() -> grade(mcqSnapshot("Câu"), choose(1L, 99L))).hasMessageContaining("không thuộc câu hỏi");
        assertThatThrownBy(() -> grade(multipleChoice(ScoringMode.partial), choose(1L, 11L, 11L))).hasMessageContaining("trùng");
    }

    @Test void normalizedResponseIsStableForIdempotencyComparison() {
        var first = normalizer.normalize(numeric(), number("80.50"));
        var second = normalizer.normalize(numeric(), number("80.5"));
        assertThat(first).isEqualTo(second);
        assertThat(normalizer.normalize(multipleChoice(ScoringMode.partial), choose(1L, 12L, 11L)).selected_option_ids())
                .containsExactly(11L, 12L);
        assertThat(normalizer.normalize(shortAnswer(), text("   "))).isNull();
    }
}
