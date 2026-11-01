package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.*;
import vn.lmsp.repository.AssessmentPaperRepository;
import vn.lmsp.repository.AssignmentSectionRepository;
import vn.lmsp.repository.PaperItemRepository;
import vn.lmsp.service.PaperGenerator.Paper;
import vn.lmsp.service.PaperPlanner.Plan;

/** Đề cho phiên làm bài — docs/exam-spec.md §3.3, §5.2. */
@Service
@RequiredArgsConstructor
public class PaperProviderService implements PaperProvider {
    private final AssessmentPaperRepository papers;
    private final PaperItemRepository items;
    private final BlueprintLoader loader;
    private final AssignmentSectionRepository sections;
    private final PaperPlanner planner;
    private final PaperStore store;

    @Override
    public AssessmentPaper paperForNewSession(Assignment assignment, User student, int attemptNo) {
        return switch (assignment.getPaperMode()) {
            case same -> sharedPaper(assignment);
            case variants -> leastUsedVariant(assignment, student.getId());
            case per_student -> studentPaper(assignment, student, attemptNo);
        };
    }

    @Override
    public List<AssignmentQuestion> paperQuestions(Long paperId) {
        return items.findAllByPaper_IdOrderByPositionAsc(paperId).stream().map(PaperItem::getAssignmentQuestion).toList();
    }

    @Override
    public List<AssignmentSection> sections(Long assignmentId) {
        return sections.findAllByAssignment_IdOrderByPositionAsc(assignmentId);
    }

    @Override
    public BigDecimal maxScore(Assignment assignment) {
        var blueprint = loader.load(assignment.getId());
        if (assignment.getPaperMode() == PaperMode.per_student) {
            BigDecimal fixed = sum(blueprint.fixed());
            return blueprint.rules().stream().map(rule -> rule.getPoints().multiply(BigDecimal.valueOf(rule.getCount())))
                    .reduce(fixed, BigDecimal::add);
        }
        List<AssessmentPaper> shared = papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(assignment.getId());
        if (!shared.isEmpty()) return shared.getFirst().getTotalPoints();
        return sum(blueprint.allLinks());
    }

    /** `same`: đề duy nhất; bài xuất bản trước khi có bản ghi đề thì tạo đề từ mọi câu theo thứ tự gốc. */
    private AssessmentPaper sharedPaper(Assignment assignment) {
        List<AssessmentPaper> shared = papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(assignment.getId());
        if (!shared.isEmpty()) return shared.getFirst();
        Plan plan = planner.pinned(assignment, assignment.getPaperSeed());
        return store.save(assignment, null, null, plan.generation().papers().getFirst(), byQuestion(plan));
    }

    /** `variants`: mã đề có ít phiên nhất; hòa thì chọn theo seed `assignment:student:0` (chênh nhau tối đa 1). */
    private AssessmentPaper leastUsedVariant(Assignment assignment, Long studentId) {
        List<AssessmentPaper> shared = papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(assignment.getId());
        if (shared.isEmpty()) throw new IllegalStateException("Assignment " + assignment.getId() + " has no variant papers");
        Map<Long, Long> used = new HashMap<>();
        for (Object[] row : papers.countSessionsByPaper(assignment.getId()))
            used.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        long least = shared.stream().mapToLong(paper -> used.getOrDefault(paper.getId(), 0L)).min().orElse(0);
        List<AssessmentPaper> ties = shared.stream().filter(paper -> used.getOrDefault(paper.getId(), 0L) == least).toList();
        int pick = new SplittableRandom(PaperShuffler.seed(assignment.getId(), studentId, 0)).nextInt(ties.size());
        return ties.get(pick);
    }

    /** `per_student`: bốc từ kho đã ghim với seed "{paper_seed}:{student_id}:{attempt_no}" và lưu đề của sinh viên. */
    private AssessmentPaper studentPaper(Assignment assignment, User student, int attemptNo) {
        long seed = PaperShuffler.seed(assignment.getPaperSeed(), student.getId(), attemptNo);
        Plan plan = planner.pinned(assignment, seed);
        Paper paper = plan.generation().papers().getFirst();
        return store.save(assignment, null, student, paper, byQuestion(plan));
    }

    private static BigDecimal sum(List<AssignmentQuestion> links) {
        return links.stream().map(AssignmentQuestion::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static Map<Long, AssignmentQuestion> byQuestion(Plan plan) {
        return plan.blueprint().allLinks().stream()
                .collect(Collectors.toMap(AssignmentQuestion::getQuestionId, Function.identity(), (a, b) -> a));
    }
}
