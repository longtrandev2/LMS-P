package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.PaperPreviewDtos.*;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentDrawRule;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.Question;
import vn.lmsp.repository.QuestionRepository;
import vn.lmsp.service.BlueprintLoader.Blueprint;
import vn.lmsp.service.PaperGenerator.Entry;
import vn.lmsp.service.PaperGenerator.Paper;
import vn.lmsp.service.PaperPlanner.Plan;

/** Dựng `PapersPreview` (api-spec.md §7) từ các đề đã sinh hoặc đã lưu. */
@Component
@RequiredArgsConstructor
public class PaperPreviewAssembler {
    private final QuestionRepository questions;
    private final QuestionVersionService snapshots;

    public PapersPreview assemble(Assignment assignment, Blueprint blueprint, List<Paper> papers, Map<Long, Integer> poolSizes,
                                  Map<String, BigDecimal> totals, List<String> warnings, boolean seeded) {
        Map<Long, AssignmentQuestion> links = blueprint.allLinks().stream()
                .collect(Collectors.toMap(AssignmentQuestion::getQuestionId, Function.identity(), (a, b) -> a));
        Set<Long> ids = new HashSet<>();
        papers.forEach(paper -> paper.entries().forEach(entry -> ids.add(entry.questionId())));
        ids.removeIf(id -> links.containsKey(id) && links.get(id).getQuestionVersion() != null);
        Map<Long, Question> current = ids.isEmpty() ? Map.of() : questions.findAllById(ids).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        boolean variants = assignment.getPaperMode() == PaperMode.variants;
        List<PreviewPaper> views = papers.stream().map(paper -> new PreviewPaper(
                variants ? PaperStore.variantCode(paper.variantNo()) : null, paper.total(), paper.entries().size(),
                sections(blueprint, paper, entry -> describe(entry, links.get(entry.questionId()), current.get(entry.questionId())))))
                .toList();
        List<RulePool> rules = blueprint.rulesByPosition().stream()
                .map(rule -> new RulePool(rule.getId(), rule.getCount(), poolSizes.getOrDefault(rule.getId(), 0))).toList();
        return new PapersPreview(assignment.getPaperMode(), seeded, views, rules, totals, warnings);
    }

    /** Cảnh báo cho bản xem trước (không chặn): kho thiếu, lệch tổng điểm, kho `per_student` nhỏ, quá 500 câu. */
    public static List<String> warnings(Assignment assignment, Plan plan) {
        List<String> warnings = new ArrayList<>();
        Map<Long, Integer> positions = plan.blueprint().rules().stream()
                .collect(Collectors.toMap(AssignmentDrawRule::getId, AssignmentDrawRule::getPosition));
        plan.generation().shortages().forEach(shortage -> warnings.add("Quy tắc " + positions.get(shortage.rule_id())
                + " thiếu câu: cần " + shortage.requested() + ", kho chỉ có " + shortage.available()));
        if (assignment.getPaperMode() == PaperMode.per_student) for (AssignmentDrawRule rule : plan.blueprint().rules()) {
            int size = plan.pool(rule.getId()).size();
            if (size >= rule.getCount() && size < 2 * rule.getCount()) warnings.add("Quy tắc " + rule.getPosition()
                    + ": kho chỉ có " + size + " câu cho " + rule.getCount() + " câu mỗi đề — đề dễ trùng giữa các sinh viên");
        }
        if (plan.generation().totalsDiffer()) warnings.add("Tổng điểm các mã đề khác nhau");
        if (plan.generation().hasNonPositiveTotal()) warnings.add("Đề chưa có câu hỏi hoặc tổng điểm bằng 0");
        if (plan.pinnedCount() > PaperPlanner.MAX_PINNED)
            warnings.add("Số câu được ghim (" + plan.pinnedCount() + ") vượt quá " + PaperPlanner.MAX_PINNED);
        return warnings;
    }

    private List<PreviewSection> sections(Blueprint blueprint, Paper paper, Function<Entry, PreviewQuestion> describe) {
        if (blueprint.sections().isEmpty()) return List.of(new PreviewSection(null, paper.entries().stream().map(describe).toList()));
        List<PreviewSection> result = new ArrayList<>();
        for (int i = 0; i < blueprint.sections().size(); i++) {
            int index = i;
            result.add(new PreviewSection(blueprint.sections().get(i).getTitle(), paper.entries().stream()
                    .filter(entry -> entry.sectionIndex() == index || index == 0 && entry.sectionIndex() < 0).map(describe).toList()));
        }
        return result;
    }

    private PreviewQuestion describe(Entry entry, AssignmentQuestion link, Question question) {
        if (link != null && link.getQuestionVersion() != null) {
            QuestionSnapshot snapshot = snapshots.read(link.getQuestionVersion());
            return new PreviewQuestion(entry.questionId(), snapshot.type(), snapshot.difficulty(), snapshot.content(),
                    entry.points(), entry.ruleId());
        }
        if (question == null) return new PreviewQuestion(entry.questionId(), null, null, null, entry.points(), entry.ruleId());
        return new PreviewQuestion(entry.questionId(), question.getType(), question.getDifficulty(), question.getContent(),
                entry.points(), entry.ruleId());
    }
}
