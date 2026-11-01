package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.List;
import vn.lmsp.model.AssessmentPaper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AssignmentSection;
import vn.lmsp.model.User;

/**
 * Đề đã sinh của bài giao theo phiên — docs/exam-spec.md §3.3, §5.2. Chỉ gọi với bài đã xuất bản; caller đã kiểm tra quyền.
 */
public interface PaperProvider {
    /**
     * Đề cho phiên mới: `same` → đề duy nhất; `variants` → mã đề ít phiên nhất (hòa thì theo seed sinh viên);
     * `per_student` → bốc từ kho đã ghim với seed "{paper_seed}:{student_id}:{attempt_no}" và lưu đề mới.
     * Phải gọi trong giao dịch của caller (đã khóa cặp bài–sinh viên).
     */
    AssessmentPaper paperForNewSession(Assignment assignment, User student, int attemptNo);

    /** Câu của một đề theo thứ tự gốc (`paper_items.position`); mỗi câu đã ghim phiên bản. */
    List<AssignmentQuestion> paperQuestions(Long paperId);

    /** Các phần theo vị trí; rỗng với bài không chia phần (coi như một phần không tên). */
    List<AssignmentSection> sections(Long assignmentId);

    /** Điểm tối đa của một đề (mọi đề bằng nhau theo §3.4). Bài `same` không có bản ghi đề: tổng điểm mọi câu. */
    BigDecimal maxScore(Assignment assignment);
}
