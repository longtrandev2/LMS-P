package vn.lmsp.support;

import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;

/** Dữ liệu mẫu cho cấu trúc đề / kỳ thi — docs/exam-spec.md §3. */
public final class ExamFixtures {
    private ExamFixtures() { }

    public static Assignment exam(PaperMode mode, Integer variants) {
        Assignment exam = assignment(AssignmentCategory.MIDTERM);
        exam.configureDelivery(60, mode, variants, null);
        return exam;
    }

    public static AssignmentSection section(Assignment assignment, long id, int position, String title) {
        return identified(new AssignmentSection(assignment, position, title), id);
    }

    /** Quy tắc trên ngân hàng 20, không lọc danh mục/độ khó. */
    public static AssignmentDrawRule rule(Assignment assignment, long id, AssignmentSection section, Integer variant,
                                          int position, QuestionType type, int count, String points) {
        return identified(new AssignmentDrawRule(assignment, section, variant, position, 20L, null, null, type, count,
                new BigDecimal(points)), id);
    }

    public static AssignmentQuestion fixed(Assignment assignment, long questionId, String points, int position,
                                           AssignmentSection section, Integer variant) {
        return new AssignmentQuestion(assignment, question(questionId, QuestionType.mcq), new BigDecimal(points), position,
                section, variant);
    }
}
