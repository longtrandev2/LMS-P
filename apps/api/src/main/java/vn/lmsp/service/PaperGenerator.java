package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import vn.lmsp.enums.PaperMode;

/**
 * Sinh đề tất định từ seed — docs/exam-spec.md §3.4, §3.6. Lớp thuần: kho câu của từng quy tắc (đã chia, sắp theo id)
 * do caller đưa vào; cùng seed + cùng kho luôn cho cùng bộ đề.
 */
public final class PaperGenerator {
    private PaperGenerator() { }

    /** `sectionIndex` = chỉ số phần (từ 0), -1 nếu bài không chia phần. */
    public record FixedItem(Long questionId, BigDecimal points, int position, int sectionIndex, Integer variantNo) { }

    /** Quy tắc theo thứ tự chia kho (phần, rồi vị trí); `pool` sắp theo id câu. */
    public record RuleSpec(Long ruleId, int position, int sectionIndex, Integer variantNo, int count, BigDecimal points,
                           List<Long> pool) { }

    /** Một câu trong đề; `ruleId` null = câu cố định. */
    public record Entry(Long questionId, Long ruleId, int sectionIndex, BigDecimal points) {
        public boolean drawn() { return ruleId != null; }
    }

    /** `variantNo` = số thứ tự mã đề (1…); luôn 1 với `same`/`per_student`. Câu theo thứ tự gốc. */
    public record Paper(int variantNo, List<Entry> entries) {
        public BigDecimal total() { return entries.stream().map(Entry::points).reduce(BigDecimal.ZERO, BigDecimal::add); }
    }

    public record Shortage(Long rule_id, int requested, int available) { }

    /** `variantTotals` theo số thứ tự mã đề ("1", "2", …); rỗng nếu không phải `variants`. */
    public record Generation(List<Paper> papers, List<Shortage> shortages, Map<String, BigDecimal> variantTotals) {
        public boolean totalsDiffer() {
            return papers.stream().map(paper -> paper.total().stripTrailingZeros()).distinct().count() > 1;
        }
        public boolean hasNonPositiveTotal() {
            return papers.isEmpty() || papers.stream().anyMatch(paper -> paper.total().signum() <= 0);
        }
        public Set<Long> drawnQuestionIds() {
            Set<Long> ids = new LinkedHashSet<>();
            papers.forEach(paper -> paper.entries().stream().filter(Entry::drawn).forEach(entry -> ids.add(entry.questionId())));
            return ids;
        }
    }

    public static Generation generate(PaperMode mode, Integer variantCount, long seed, List<FixedItem> fixed, List<RuleSpec> rules) {
        boolean variants = mode == PaperMode.variants;
        int paperCount = variants && variantCount != null && variantCount > 0 ? variantCount : 1;
        List<List<Entry>> drawn = new ArrayList<>();
        for (int i = 0; i < paperCount; i++) drawn.add(new ArrayList<>());
        List<Shortage> shortages = new ArrayList<>();
        for (RuleSpec rule : rules) {
            if (rule.pool().size() < rule.count()) shortages.add(new Shortage(rule.ruleId(), rule.count(), rule.pool().size()));
            Map<Long, Integer> usage = new HashMap<>();
            for (int v = 1; v <= paperCount; v++) {
                if (rule.variantNo() != null && rule.variantNo() != v) continue;
                List<Long> order = shuffle(rule.pool(), new SplittableRandom(mix(seed, rule.position(), v)));
                if (variants) order.sort(Comparator.comparingInt(id -> usage.getOrDefault(id, 0)));
                for (Long id : order.subList(0, Math.min(rule.count(), order.size()))) {
                    usage.merge(id, 1, Integer::sum);
                    drawn.get(v - 1).add(new Entry(id, rule.ruleId(), rule.sectionIndex(), rule.points()));
                }
            }
        }
        List<Paper> papers = new ArrayList<>();
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (int v = 1; v <= paperCount; v++) {
            Paper paper = new Paper(v, ordered(fixed, drawn.get(v - 1), v));
            papers.add(paper);
            if (variants) totals.put(String.valueOf(v), paper.total());
        }
        return new Generation(papers, shortages, totals);
    }

    /** Thứ tự gốc: theo phần; trong phần câu cố định trước (theo position), rồi câu bốc theo quy tắc và thứ tự bốc. */
    private static List<Entry> ordered(List<FixedItem> fixed, List<Entry> drawn, int variant) {
        List<Entry> entries = new ArrayList<>(fixed.stream()
                .filter(item -> item.variantNo() == null || item.variantNo() == variant)
                .sorted(Comparator.comparingInt(FixedItem::sectionIndex).thenComparingInt(FixedItem::position)
                        .thenComparing(FixedItem::questionId))
                .map(item -> new Entry(item.questionId(), null, item.sectionIndex(), item.points())).toList());
        entries.addAll(drawn);
        entries.sort(Comparator.comparingInt(Entry::sectionIndex).thenComparingInt(entry -> entry.drawn() ? 1 : 0));
        return entries;
    }

    private static List<Long> shuffle(List<Long> pool, SplittableRandom random) {
        List<Long> result = new ArrayList<>(pool);
        for (int i = result.size() - 1; i > 0; i--) Collections.swap(result, i, random.nextInt(i + 1));
        return result;
    }

    static long mix(long seed, int rulePosition, int variant) {
        return seed ^ (rulePosition * 0x9E3779B97F4A7C15L) ^ (variant * 0xC2B2AE3D27D4EB4FL);
    }
}
