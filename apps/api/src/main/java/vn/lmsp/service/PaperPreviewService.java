package vn.lmsp.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.PaperPreviewDtos.PapersPreview;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.AssessmentPaper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.PaperItem;
import vn.lmsp.repository.AssessmentPaperRepository;
import vn.lmsp.repository.PaperItemRepository;
import vn.lmsp.service.BlueprintLoader.Blueprint;
import vn.lmsp.service.PaperGenerator.Entry;
import vn.lmsp.service.PaperGenerator.Paper;
import vn.lmsp.service.PaperPlanner.Plan;

/**
 * Xem trước đề và "Bốc lại" — docs/exam-spec.md §3.5, api-spec.md §7. Nháp: sinh tại chỗ từ `paper_seed` (kho thiếu chỉ
 * cảnh báo). Đã xuất bản: đọc đề đã lưu; `per_student` hiện đề mẫu bốc từ kho đã ghim với seed của giảng viên.
 */
@Service
@RequiredArgsConstructor
public class PaperPreviewService {
    private final AssignmentAccess access;
    private final PaperPlanner planner;
    private final BlueprintLoader loader;
    private final BlueprintViews views;
    private final AssessmentPaperRepository papers;
    private final PaperItemRepository items;
    private final PaperPreviewAssembler assembler;
    private final AuditService audit;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public PapersPreview preview(Long id, Long actorId, boolean admin) {
        return build(access.lecturerAssignment(id, actorId, admin, false), actorId);
    }

    @Transactional
    public PapersPreview reseed(Long id, Long actorId, boolean admin) {
        Assignment item = access.lecturerAssignment(id, actorId, admin, true);
        if (item.isPublished())
            throw new LmsException("CONFLICT", "Bài đã xuất bản nên không thể bốc lại đề", HttpStatus.CONFLICT, null);
        long old = item.getPaperSeed(), next;
        do next = random.nextLong(); while (next == old);
        item.reseed(next);
        audit.record(actorId, "assignment.reseed", "assignment", id, Map.of("paper_seed", old), Map.of("paper_seed", next));
        return build(item, actorId);
    }

    private PapersPreview build(Assignment item, Long actorId) {
        boolean perStudent = item.getPaperMode() == PaperMode.per_student;
        if (item.isPublished() && item.isSessionBased() && !perStudent) return stored(item);
        long seed = perStudent ? sampleSeed(item, actorId) : item.getPaperSeed();
        Plan plan = item.isPublished() ? planner.pinned(item, seed) : planner.plan(item, seed);
        Map<Long, Integer> sizes = new HashMap<>();
        plan.pools().forEach((rule, pool) -> sizes.put(rule, pool.size()));
        boolean seeded = !item.isPublished() || perStudent;
        return assembler.assemble(item, plan.blueprint(), plan.generation().papers(), sizes,
                plan.generation().variantTotals(), PaperPreviewAssembler.warnings(item, plan), seeded);
    }

    /** Đề mẫu `per_student`: seed "{paper_seed}:{lecturer_id}:0", cố định với mỗi giảng viên cho tới khi bốc lại. */
    static long sampleSeed(Assignment item, Long actorId) {
        return PaperShuffler.seed(item.getPaperSeed(), actorId, 0);
    }

    private PapersPreview stored(Assignment item) {
        Blueprint blueprint = loader.load(item.getId());
        List<AssessmentPaper> shared = papers.findAllByAssignment_IdAndStudentIsNullOrderByCodeAscIdAsc(item.getId());
        Map<Long, List<PaperItem>> byPaper = new HashMap<>();
        if (!shared.isEmpty()) items.findAllByPaper_IdInOrderByPaper_IdAscPositionAsc(shared.stream().map(AssessmentPaper::getId).toList())
                .forEach(row -> byPaper.computeIfAbsent(row.getPaperId(), key -> new ArrayList<>()).add(row));
        List<Paper> result = new ArrayList<>();
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (int i = 0; i < shared.size(); i++) {
            List<Entry> entries = byPaper.getOrDefault(shared.get(i).getId(), List.of()).stream().map(row -> {
                AssignmentQuestion link = row.getAssignmentQuestion();
                return new Entry(link.getQuestionId(), link.getDrawRuleId(), blueprint.sectionIndex(link.getSection()), link.getPoints());
            }).toList();
            result.add(new Paper(i + 1, entries));
            if (item.getPaperMode() == PaperMode.variants) totals.put(String.valueOf(i + 1), shared.get(i).getTotalPoints());
        }
        return assembler.assemble(item, blueprint, result, views.poolSizes(item, blueprint), totals, List.of(), false);
    }
}
