package vn.lmsp.service;

import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class AssignmentReadService {
    /** Một câu trong đề sinh viên đã thấy, kèm snapshot để chấm/xem lại. */
    public record PaperItem(AssignmentQuestion link, QuestionSnapshot snapshot, AssignmentQuestionView view) { }

    private final AssignmentQuestionRepository links;
    private final QuestionVersionRepository versions;
    private final QuestionVersionService snapshots;
    private final AssignmentMapper mapper;
    private final QuestionPaperMapper papers;

    public AssignmentSummary summary(Assignment assignment) {
        return mapper.toSummary(assignment, links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId()));
    }

    /** Bản giảng viên: thứ tự gốc, có đáp án và mọi test. */
    public AssignmentDetails details(Assignment assignment) {
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId());
        var views = questions.stream().map(link -> {
            QuestionVersion version = version(link);
            return papers.lecturer(link, version.getId(), snapshots.read(version));
        }).toList();
        return mapper.toDetails(mapper.toSummary(assignment, questions), views);
    }

    /** Đề cho sinh viên, trộn theo seed (assignment, student, n) — docs/assessment-spec.md §6.1. */
    public AssignmentDetails studentDetails(Assignment assignment, Long studentId, int n) {
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
