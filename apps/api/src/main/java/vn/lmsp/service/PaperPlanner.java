package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentDrawRule;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.service.BlueprintLoader.Blueprint;
import vn.lmsp.service.PaperGenerator.FixedItem;
import vn.lmsp.service.PaperGenerator.Generation;
import vn.lmsp.service.PaperGenerator.RuleSpec;

/** Ghép cấu trúc đề + kho câu + seed thành bộ đề — docs/exam-spec.md §3.4–3.6. */
@Component
@RequiredArgsConstructor
public class PaperPlanner {
    public static final int MAX_PINNED = 500;

    /** Kết quả sinh đề kèm cấu trúc và kho đã dùng. */
    public record Plan(Assignment assignment, Blueprint blueprint, Map<Long, List<Long>> pools, Generation generation) {
        public List<Long> pool(Long ruleId) { return pools.getOrDefault(ruleId, List.of()); }

        /** Số câu sẽ ghim: `per_student` ghim toàn bộ kho, mode khác chỉ câu có trong ít nhất một đề. */
        public int pinnedCount() {
            int fixed = blueprint.fixed().size();
            if (assignment.getPaperMode() == PaperMode.per_student)
                return fixed + pools.values().stream().mapToInt(List::size).sum();
            return fixed + generation.drawnQuestionIds().size();
        }
    }

    private final BlueprintLoader loader;
    private final PoolResolver resolver;

    /** Bản nháp / lúc xuất bản: kho giải từ ngân hàng hiện tại. */
    public Plan plan(Assignment assignment, long seed) {
        Blueprint blueprint = loader.load(assignment.getId());
        Map<Long, List<Long>> pools = blueprint.rules().isEmpty() ? Map.of()
                : resolver.resolve(assignment, blueprint.rules(), blueprint.fixedQuestionIds());
        return new Plan(assignment, blueprint, pools, generate(assignment, blueprint, pools, seed));
    }

    /** Bài đã xuất bản: kho = các câu đã ghim theo `draw_rule_id` (đề riêng `per_student`, đề mẫu). */
    public Plan pinned(Assignment assignment, long seed) {
        Blueprint blueprint = loader.load(assignment.getId());
        Map<Long, List<Long>> pools = pinnedPools(blueprint);
        return new Plan(assignment, blueprint, pools, generate(assignment, blueprint, pools, seed));
    }

    public static Map<Long, List<Long>> pinnedPools(Blueprint blueprint) {
        Map<Long, List<Long>> pools = new LinkedHashMap<>();
        for (AssignmentDrawRule rule : blueprint.rules()) pools.put(rule.getId(), new ArrayList<>());
        for (AssignmentQuestion link : blueprint.drawn())
            pools.computeIfAbsent(link.getDrawRuleId(), key -> new ArrayList<>()).add(link.getQuestionId());
        pools.values().forEach(Collections::sort);
        return pools;
    }

    private Generation generate(Assignment assignment, Blueprint blueprint, Map<Long, List<Long>> pools, long seed) {
        List<FixedItem> fixed = blueprint.fixed().stream().map(link -> new FixedItem(link.getQuestionId(), link.getPoints(),
                link.getPosition(), blueprint.sectionIndex(link.getSection()), link.getVariantNo())).toList();
        List<RuleSpec> rules = blueprint.rules().stream().map(rule -> new RuleSpec(rule.getId(), rule.getPosition(),
                blueprint.sectionIndex(rule.getSection()), rule.getVariantNo(), rule.getCount(), rule.getPoints(),
                pools.getOrDefault(rule.getId(), List.of()))).toList();
        return PaperGenerator.generate(assignment.getPaperMode(), assignment.getVariantCount(), seed, fixed, rules);
    }
}
