package vn.lmsp.support;

import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.model.*;

/** Bài giao theo phiên, đề và phiên mẫu — docs/exam-spec.md §5. */
public final class SessionFixtures {
    private SessionFixtures() { }

    /** Bài đã xuất bản, mở từ hôm qua, đóng sau `closesInMinutes` phút. */
    public static Assignment sessionAssignment(AssignmentCategory category, Integer timeLimit, long closesInMinutes) {
        Assignment assignment = assignment(category);
        LocalDateTime now = UtcTime.now();
        assignment.update("Kỳ thi", null, category, now.minusDays(1), now.plusMinutes(closesInMinutes), false, null, 0,
                category == AssignmentCategory.QUIZ ? null : 1, assignment.getScorePolicy());
        assignment.configureDelivery(timeLimit, PaperMode.same, null, null);
        assignment.publish();
        return assignment;
    }

    public static AssessmentPaper paper(Assignment assignment, String code) {
        return identified(new AssessmentPaper(assignment, code, null, BigDecimal.TEN), 70);
    }

    /** Câu đã ghim phiên bản; `id` dùng cho cả assignment_question (id + 400) và question. */
    public static AssignmentQuestion pinned(Assignment assignment, long questionId, QuestionSnapshot snapshot,
                                            String points, AssignmentSection section) {
        Question question = question(questionId, snapshot.type());
        AssignmentQuestion link = identified(new AssignmentQuestion(assignment, question, new BigDecimal(points),
                (int) questionId, section, null), questionId + 400);
        link.pin(version(question, 1, snapshot));
        return link;
    }

    public static AssignmentQuestion mcq(Assignment assignment, long questionId) {
        return pinned(assignment, questionId, mcqSnapshot("Câu " + questionId), "2", null);
    }

    public static AssignmentQuestion code(Assignment assignment, long questionId) {
        return pinned(assignment, questionId, programmingSnapshot(), "5", null);
    }

    public static AttemptSession session(Assignment assignment, AssessmentPaper paper, List<AssignmentQuestion> links,
                                         LocalDateTime endsAt) {
        List<Long> order = links.stream().map(AssignmentQuestion::getId).toList();
        return identified(new AttemptSession(assignment, user(42, "student"), 1, paper, order,
                endsAt.minusMinutes(60), endsAt, null), 900);
    }
}
