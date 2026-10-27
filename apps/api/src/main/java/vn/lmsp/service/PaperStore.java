package vn.lmsp.service;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.model.AssessmentPaper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.PaperItem;
import vn.lmsp.model.User;
import vn.lmsp.repository.AssessmentPaperRepository;
import vn.lmsp.repository.PaperItemRepository;
import vn.lmsp.service.PaperGenerator.Entry;
import vn.lmsp.service.PaperGenerator.Paper;

/** Lưu một đề đã sinh (`assessment_papers` + `paper_items` theo thứ tự gốc) — docs/exam-spec.md §3.6. */
@Component
@RequiredArgsConstructor
public class PaperStore {
    private final AssessmentPaperRepository papers;
    private final PaperItemRepository items;

    /** `byQuestion`: question_id → link của bài (câu cố định hoặc câu đã bốc). */
    public AssessmentPaper save(Assignment assignment, String code, User student, Paper paper,
                                Map<Long, AssignmentQuestion> byQuestion) {
        AssessmentPaper saved = new AssessmentPaper(assignment, code, student, paper.total());
        papers.save(saved);
        int position = 0;
        for (Entry entry : paper.entries()) {
            AssignmentQuestion link = byQuestion.get(entry.questionId());
            if (link == null) throw new IllegalStateException("Question " + entry.questionId() + " is not linked to the assignment");
            items.save(new PaperItem(saved, link, ++position));
        }
        return saved;
    }

    /** Mã đề thứ `variantNo` (1 → "101"). */
    public static String variantCode(int variantNo) { return String.valueOf(100 + variantNo); }
}
