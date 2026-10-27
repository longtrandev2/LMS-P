package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AssignmentDtos.DrawRuleView;
import vn.lmsp.dto.AssignmentDtos.PlacementView;
import vn.lmsp.dto.AssignmentDtos.SectionView;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.AssessmentPaper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentDrawRule;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.repository.AssessmentPaperRepository;
import vn.lmsp.repository.PaperItemRepository;
import vn.lmsp.service.BlueprintLoader.Blueprint;

/**
 * Số câu/tổng điểm của MỘT đề và cấu trúc đề cho giảng viên — docs/exam-spec.md §3, api-spec.md §7.
 * Bài thường (không quy tắc, không mã đề) cho đúng số liệu cũ: mọi câu của bài.
 */
@Component
@RequiredArgsConstructor
public class BlueprintViews {
    public record Metrics(int questionCount, BigDecimal totalPoints) { }
    public record Views(List<SectionView> sections, List<DrawRuleView> drawRules, List<PlacementView> placements) { }

    private final BlueprintLoader loader;
    private final PoolResolver resolver;
    private final AssessmentPaperRepository papers;
    private final PaperItemRepository items;

    /**
     * Đã xuất bản: `same`/`variants` theo đề lưu đầu tiên; `per_student` = câu cố định + Σ count × points; bài thường
     * = mọi link. Nháp: câu chung + mã đề 1 (câu cố định và quy tắc).
     */
    public Metrics metrics(Assignment assignment) {
        Blueprint blueprint = loader.load(assignment.getId());
        if (assignment.isPublished()) {
            if (assignment.isSessionBased() && assignment.getPaperMode() == PaperMode.per_student) return blueprintTotals(blueprint, 1);
            if (assignment.isSessionBased()) {
                List<AssessmentPaper> shared = papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(assignment.getId());
                if (!shared.isEmpty())
                    return new Metrics((int) items.countByPaper_Id(shared.getFirst().getId()), shared.getFirst().getTotalPoints());
            }
            return sum(blueprint.allLinks());
        }
        return blueprintTotals(blueprint, 1);
    }

    public Views views(Assignment assignment) {
        Blueprint blueprint = loader.load(assignment.getId());
        List<SectionView> sections = blueprint.sections().stream()
                .map(section -> new SectionView(section.getId(), section.getPosition(), section.getTitle())).toList();
        Map<Long, Integer> pools = poolSizes(assignment, blueprint);
        List<DrawRuleView> rules = blueprint.rulesByPosition().stream().map(rule -> new DrawRuleView(rule.getId(),
                blueprint.sectionIndexOrNull(rule.getSection()), rule.getVariantNo(), rule.getBankId(), rule.getCategoryId(),
                rule.getDifficulty(), rule.getType(), rule.getCount(), rule.getPoints(),
                pools.getOrDefault(rule.getId(), 0))).toList();
        List<PlacementView> placements = blueprint.fixed().stream().map(link -> new PlacementView(link.getQuestionId(),
                blueprint.sectionIndexOrNull(link.getSection()), link.getVariantNo())).toList();
        return new Views(sections, rules, placements);
    }

    /** Đã xuất bản `per_student`: kho đã ghim; còn lại: kho hiện tại trong ngân hàng (§3.4). */
    public Map<Long, Integer> poolSizes(Assignment assignment, Blueprint blueprint) {
        if (blueprint.rules().isEmpty()) return Map.of();
        Map<Long, List<Long>> pools = assignment.isPublished() && assignment.getPaperMode() == PaperMode.per_student
                ? PaperPlanner.pinnedPools(blueprint)
                : resolver.resolve(assignment, blueprint.rules(), blueprint.fixedQuestionIds());
        Map<Long, Integer> sizes = new HashMap<>();
        pools.forEach((rule, pool) -> sizes.put(rule, pool.size()));
        return sizes;
    }

    private static Metrics blueprintTotals(Blueprint blueprint, int variant) {
        int count = 0; BigDecimal points = BigDecimal.ZERO;
        for (AssignmentQuestion link : blueprint.fixed()) {
            if (!inVariant(link.getVariantNo(), variant)) continue;
            count++; points = points.add(link.getPoints());
        }
        for (AssignmentDrawRule rule : blueprint.rules()) {
            if (!inVariant(rule.getVariantNo(), variant)) continue;
            count += rule.getCount(); points = points.add(rule.getPoints().multiply(BigDecimal.valueOf(rule.getCount())));
        }
        return new Metrics(count, points);
    }

    private static boolean inVariant(Integer variantNo, int variant) { return variantNo == null || variantNo == variant; }

    private static Metrics sum(List<AssignmentQuestion> links) {
        return new Metrics(links.size(), links.stream().map(AssignmentQuestion::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add));
    }
}
