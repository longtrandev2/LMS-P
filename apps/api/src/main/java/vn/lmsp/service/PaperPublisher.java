package vn.lmsp.service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.*;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.QuestionRepository;
import vn.lmsp.service.PaperGenerator.Generation;
import vn.lmsp.service.PaperGenerator.Paper;
import vn.lmsp.service.PaperPlanner.Plan;

/**
 * Bước sinh đề khi xuất bản — docs/exam-spec.md §3.6: bốc đề, tạo link câu bốc (`draw_rule_id`), sau khi ghim thì lưu đề.
 * Bài không giao theo phiên và không có quy tắc: không làm gì (luồng cũ).
 */
@Component
@RequiredArgsConstructor
public class PaperPublisher {
    /** `drawn` = link mới tạo cho câu bốc (chưa ghim). */
    public record Prepared(Plan plan, List<AssignmentQuestion> drawn) { }

    private final PaperPlanner planner;
    private final AssignmentQuestionRepository links;
    private final QuestionRepository questions;
    private final PaperStore store;

    /** null = bài thường không có quy tắc bốc. Lỗi kho thiếu / lệch tổng điểm / quá 500 câu → 400 `VALIDATION_ERROR`. */
    public Prepared prepare(Assignment assignment) {
        Plan plan = planner.plan(assignment, assignment.getPaperSeed());
        if (!assignment.isSessionBased() && plan.blueprint().rules().isEmpty()) return null;
        requireValid(assignment, plan);
        return new Prepared(plan, createDrawn(assignment, plan));
    }

    /** Lưu đề `same` (1 đề, code null) / `variants` (mã 101…); `per_student` và bài không theo phiên không có đề lưu sẵn. */
    public void persistPapers(Assignment assignment, Prepared prepared, List<AssignmentQuestion> rows) {
        if (prepared == null || !assignment.isSessionBased() || assignment.getPaperMode() == PaperMode.per_student) return;
        Map<Long, AssignmentQuestion> byQuestion = rows.stream()
                .collect(Collectors.toMap(AssignmentQuestion::getQuestionId, Function.identity(), (a, b) -> a));
        boolean variants = assignment.getPaperMode() == PaperMode.variants;
        for (Paper paper : prepared.plan().generation().papers())
            store.save(assignment, variants ? PaperStore.variantCode(paper.variantNo()) : null, null, paper, byQuestion);
    }

    static void requireValid(Assignment assignment, Plan plan) {
        Generation generation = plan.generation();
        if (plan.blueprint().fixed().isEmpty() && plan.blueprint().rules().isEmpty())
            throw bad("Thêm ít nhất một câu hỏi trước khi xuất bản", null);
        if (!generation.shortages().isEmpty())
            throw bad("Ngân hàng không đủ câu cho quy tắc bốc ngẫu nhiên", Map.of("shortages", generation.shortages()));
        boolean variants = assignment.getPaperMode() == PaperMode.variants;
        Object totals = variants ? Map.of("variant_totals", generation.variantTotals()) : null;
        if (generation.totalsDiffer()) throw bad("Các mã đề phải có cùng tổng điểm", totals);
        if (generation.hasNonPositiveTotal()) throw bad("Tổng điểm của mỗi đề phải lớn hơn 0", totals);
        int pinned = plan.pinnedCount();
        if (pinned > PaperPlanner.MAX_PINNED)
            throw bad("Một bài chỉ ghim tối đa " + PaperPlanner.MAX_PINNED + " câu (tính cả kho câu bốc ngẫu nhiên)",
                    Map.of("pinned_count", pinned));
    }

    private List<AssignmentQuestion> createDrawn(Assignment assignment, Plan plan) {
        Map<Long, Long> ruleOf = new LinkedHashMap<>();
        if (assignment.getPaperMode() == PaperMode.per_student) {
            plan.blueprint().rules().forEach(rule -> plan.pool(rule.getId()).forEach(id -> ruleOf.put(id, rule.getId())));
        } else {
            plan.generation().papers().forEach(paper -> paper.entries().stream().filter(PaperGenerator.Entry::drawn)
                    .forEach(entry -> ruleOf.putIfAbsent(entry.questionId(), entry.ruleId())));
        }
        if (ruleOf.isEmpty()) return List.of();
        Map<Long, AssignmentDrawRule> rules = plan.blueprint().rules().stream()
                .collect(Collectors.toMap(AssignmentDrawRule::getId, Function.identity()));
        Map<Long, Question> loaded = questions.findAllById(ruleOf.keySet()).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        int position = plan.blueprint().fixed().stream().mapToInt(AssignmentQuestion::getPosition).max().orElse(0);
        List<AssignmentQuestion> created = new ArrayList<>();
        for (var pick : ruleOf.entrySet()) {
            Question question = loaded.get(pick.getKey());
            if (question == null) throw bad("Một câu hỏi đã bị xóa khỏi ngân hàng", null);
            AssignmentQuestion link = AssignmentQuestion.drawn(assignment, question, rules.get(pick.getValue()), ++position);
            links.save(link);
            created.add(link);
        }
        return created;
    }

    private static LmsException bad(String message, Object details) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, details);
    }
}
