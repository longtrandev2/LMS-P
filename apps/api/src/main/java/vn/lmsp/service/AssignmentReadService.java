package vn.lmsp.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.AssignmentDtos.AssignmentDetails;
import vn.lmsp.dto.AssignmentDtos.AssignmentSummary;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.QuestionVersionRepository;

@Service
@Transactional(readOnly = true)
public class AssignmentReadService {
    /** Một câu trong đề sinh viên đã thấy, kèm snapshot để chấm/xem lại. */
    public record PaperItem(AssignmentQuestion link, QuestionSnapshot snapshot, AssignmentQuestionView view) { }

    private final AssignmentQuestionRepository links;
    private final QuestionVersionRepository versions;
    private final QuestionVersionService snapshots;
    private final AssignmentMapper mapper;
    private final QuestionPaperMapper papers;
    /** null (dựng tay trong test cũ) = số liệu theo mọi link, không có cấu trúc đề. */
    private final BlueprintViews blueprints;

    public AssignmentReadService(AssignmentQuestionRepository links, QuestionVersionRepository versions,
                                 QuestionVersionService snapshots, AssignmentMapper mapper, QuestionPaperMapper papers) {
        this(links, versions, snapshots, mapper, papers, null);
    }

    @Autowired
    public AssignmentReadService(AssignmentQuestionRepository links, QuestionVersionRepository versions,
                                 QuestionVersionService snapshots, AssignmentMapper mapper, QuestionPaperMapper papers,
                                 BlueprintViews blueprints) {
        this.links = links; this.versions = versions; this.snapshots = snapshots; this.mapper = mapper;
        this.papers = papers; this.blueprints = blueprints;
    }

    /** `question_count`/`total_points` mô tả một đề — exam-spec.md §3.4, api-spec.md §7. */
    public AssignmentSummary summary(Assignment assignment) {
        if (blueprints == null)
            return mapper.toSummary(assignment, links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId()));
        var metrics = blueprints.metrics(assignment);
        return mapper.toSummary(assignment, metrics.questionCount(), metrics.totalPoints());
    }

    /** Bản giảng viên: thứ tự gốc, có đáp án và mọi test, kèm cấu trúc đề (phần, quy tắc + kho, vị trí câu cố định). */
    public AssignmentDetails details(Assignment assignment) {
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId());
        var views = questions.stream().map(link -> {
            QuestionVersion version = version(link);
            return papers.lecturer(link, version.getId(), snapshots.read(version));
        }).toList();
        if (blueprints == null) return mapper.toDetails(mapper.toSummary(assignment, questions), views);
        var blueprint = blueprints.views(assignment);
        return mapper.toDetails(summary(assignment), views, blueprint.sections(), blueprint.drawRules(), blueprint.placements());
    }

    /**
     * Đề cho sinh viên, trộn theo seed (assignment, student, n) — docs/assessment-spec.md §6.1. Bài giao theo phiên chỉ
     * trả metadata, `questions` rỗng: đề chỉ đọc qua phiên (BR9, exam-spec.md §5.3).
     */
    public AssignmentDetails studentDetails(Assignment assignment, Long studentId, int n) {
        if (assignment.isSessionBased()) return mapper.toDetails(summary(assignment), List.of());
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId());
        var views = paper(assignment, questions, studentId, n).stream().map(PaperItem::view).toList();
        return mapper.toDetails(mapper.toSummary(assignment, questions), views);
    }

    public List<PaperItem> paper(Assignment assignment, List<AssignmentQuestion> questions, Long studentId, int n) {
        PaperShuffler shuffler = PaperShuffler.of(assignment.getId(), studentId, n);
        List<AssignmentQuestion> ordered = assignment.isShuffleQuestions() ? shuffler.permute(questions, 0) : questions;
        List<PaperItem> items = new ArrayList<>();
        for (AssignmentQuestion link : ordered) {
            QuestionVersion version = version(link);
            QuestionSnapshot snapshot = snapshots.read(version);
            items.add(new PaperItem(link, snapshot, papers.student(link, version.getId(), snapshot, items.size() + 1,
                    shuffler, assignment.isShuffleOptions())));
        }
        return items;
    }

    private QuestionVersion version(AssignmentQuestion link) {
        return link.getQuestionVersion() != null ? link.getQuestionVersion()
                : versions.findTopByQuestion_IdOrderByVersionNoDesc(link.getQuestionId()).orElseThrow();
    }
}
