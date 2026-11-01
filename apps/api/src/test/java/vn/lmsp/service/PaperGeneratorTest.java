package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.service.PaperGenerator.*;

class PaperGeneratorTest {
    private static List<Long> ids(long from, long to) { return LongStream.rangeClosed(from, to).boxed().toList(); }

    private static RuleSpec rule(long id, int position, int section, Integer variant, int count, List<Long> pool) {
        return new RuleSpec(id, position, section, variant, count, BigDecimal.ONE, pool);
    }

    private static List<Long> questions(Paper paper) { return paper.entries().stream().map(Entry::questionId).toList(); }

    @Test void sameSeedGivesSamePapersAndAnotherSeedChangesThem() {
        var rules = List.of(rule(1, 1, -1, null, 5, ids(1, 30)));
        var first = PaperGenerator.generate(PaperMode.same, null, 42L, List.of(), rules);
        var again = PaperGenerator.generate(PaperMode.same, null, 42L, List.of(), rules);
        assertThat(again).isEqualTo(first);
        assertThat(questions(first.papers().getFirst())).hasSize(5).doesNotHaveDuplicates().allMatch(id -> id >= 1 && id <= 30);
        Set<List<Long>> seen = new HashSet<>();
        for (long seed = 1; seed <= 6; seed++)
            seen.add(questions(PaperGenerator.generate(PaperMode.same, null, seed, List.of(), rules).papers().getFirst()));
        assertThat(seen).hasSizeGreaterThan(1);
    }

    @Test void variantsPreferLeastUsedQuestionsSoPapersDifferAsMuchAsPossible() {
        var disjoint = PaperGenerator.generate(PaperMode.variants, 2, 7L, List.of(), List.of(rule(1, 1, -1, null, 5, ids(1, 10))));
        assertThat(disjoint.papers()).hasSize(2);
        Set<Long> union = new HashSet<>(questions(disjoint.papers().get(0)));
        assertThat(questions(disjoint.papers().get(1))).doesNotContainAnyElementsOf(union);
        union.addAll(questions(disjoint.papers().get(1)));
        assertThat(union).containsExactlyInAnyOrderElementsOf(ids(1, 10));

        var crowded = PaperGenerator.generate(PaperMode.variants, 3, 7L, List.of(), List.of(rule(1, 1, -1, null, 4, ids(1, 10))));
        Map<Long, Integer> usage = new HashMap<>();
        crowded.papers().forEach(paper -> questions(paper).forEach(id -> usage.merge(id, 1, Integer::sum)));
        assertThat(usage.keySet()).containsExactlyInAnyOrderElementsOf(ids(1, 10));
        assertThat(usage.values()).allMatch(count -> count == 1 || count == 2);
        assertThat(crowded.variantTotals()).containsOnlyKeys("1", "2", "3");
        assertThat(crowded.totalsDiffer()).isFalse();
    }

    @Test void originalOrderIsBySectionThenFixedByPositionThenDrawnByRuleOrder() {
        var fixed = List.of(new FixedItem(900L, BigDecimal.TEN, 3, 1, null), new FixedItem(800L, BigDecimal.TEN, 2, 0, null),
                new FixedItem(700L, BigDecimal.TEN, 1, 0, null));
        var rules = List.of(rule(1, 1, 0, null, 2, ids(1, 2)), rule(2, 2, 0, null, 1, ids(3, 3)), rule(3, 3, 1, null, 1, ids(4, 4)));
        var paper = PaperGenerator.generate(PaperMode.same, null, 1L, fixed, rules).papers().getFirst();
        var order = questions(paper);
        assertThat(order.subList(0, 2)).containsExactly(700L, 800L);
        assertThat(order.subList(2, 4)).containsExactlyInAnyOrder(1L, 2L);
        assertThat(order.subList(4, 7)).containsExactly(3L, 900L, 4L);
        assertThat(paper.total()).isEqualByComparingTo("34");
    }

    @Test void shortageIsReportedAndAvailableQuestionsAreStillDrawn() {
        var generation = PaperGenerator.generate(PaperMode.same, null, 1L, List.of(), List.of(rule(5, 1, -1, null, 3, ids(1, 2))));
        assertThat(generation.shortages()).containsExactly(new Shortage(5L, 3, 2));
        assertThat(questions(generation.papers().getFirst())).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test void variantSpecificItemsOnlyAppearInTheirPaperAndTotalsAreReported() {
        var fixed = List.of(new FixedItem(100L, BigDecimal.TEN, 1, -1, 1), new FixedItem(200L, new BigDecimal("9.5"), 2, -1, 2));
        var rules = List.of(rule(1, 1, -1, 2, 1, ids(1, 5)));
        var generation = PaperGenerator.generate(PaperMode.variants, 2, 3L, fixed, rules);
        assertThat(questions(generation.papers().get(0))).containsExactly(100L);
        assertThat(questions(generation.papers().get(1))).hasSize(2).startsWith(200L);
        assertThat(generation.variantTotals()).containsEntry("1", BigDecimal.TEN);
        assertThat(generation.variantTotals().get("2")).isEqualByComparingTo("10.5");
        assertThat(generation.totalsDiffer()).isTrue();
    }

    @Test void emptyPaperHasNonPositiveTotal() {
        assertThat(PaperGenerator.generate(PaperMode.same, null, 1L, List.of(), List.of()).hasNonPositiveTotal()).isTrue();
    }
}
