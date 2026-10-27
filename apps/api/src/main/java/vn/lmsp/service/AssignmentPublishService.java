package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.AssignmentDetails;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/**
 * Xuất bản bài: kiểm tra đầy đủ câu lập trình (§4), chặn theo kiểm tra đề (§7) rồi ghim phiên bản
 * — docs/assessment-spec.md, docs/api-spec.md §6.
 */
@Service
@RequiredArgsConstructor
public class AssignmentPublishService {
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final QuestionRepository questions;
    private final QuestionVersionRepository versions;
    private final QuestionBankService banks;
    private final QuestionVersionService snapshots;
    private final ProgrammingProblemValidator problems;
    private final ProblemCheckGate checks;
    private final AssignmentReadService reader;
    private final AuditService audit;

    @Transactional
    public AssignmentDetails publish(Long id, Long actorId, boolean admin, boolean confirmUnverified) {
        Assignment item = access.lecturerAssignment(id, actorId, admin, true);
        if (item.isPublished()) return reader.details(item);
        List<AssignmentQuestion> rows = links.findAllByAssignment_IdOrderByPositionAscIdAsc(id);
        if (rows.isEmpty()) throw bad("Thêm ít nhất một câu hỏi trước khi xuất bản");
        Map<AssignmentQuestion, QuestionVersion> pins = new LinkedHashMap<>();
        List<Long> failed = new ArrayList<>(), unverified = new ArrayList<>();
        for (AssignmentQuestion row : rows) {
            Question question = questions.findByIdAndDeletedFalse(row.getQuestionId())
                    .orElseThrow(() -> bad("Một câu hỏi đã bị xóa khỏi ngân hàng"));
            banks.requireQuestionUsage(question, item.getLmsClass(), actorId, admin);
            QuestionVersion version = versions.findTopByQuestion_IdOrderByVersionNoDesc(question.getId())
                    .orElseThrow(() -> bad("Câu hỏi chưa có phiên bản"));
            var snapshot = snapshots.read(version);
            if (item.getCategory() == AssignmentCategory.QUIZ && snapshot.type() == QuestionType.programming)
                throw bad("Quiz không được chứa câu lập trình");
            if (snapshot.type() == QuestionType.programming) {
                try { problems.validateProblem(snapshot); }
                catch (IllegalArgumentException error) { throw bad("Câu hỏi #" + question.getId() + ": " + error.getMessage()); }
                switch (checks.status(version.getId())) {
                    case FAILED -> failed.add(question.getId());
                    case UNVERIFIED -> unverified.add(question.getId());
                    case PASSED -> { }
                }
            }
            pins.put(row, version);
        }
        if (!failed.isEmpty()) throw blocked("PROBLEM_CHECK_FAILED",
                "Lời giải mẫu chưa đạt AC trên phiên bản sẽ ghim", failed);
        if (!unverified.isEmpty() && !confirmUnverified) throw blocked("PROBLEM_UNVERIFIED",
                "Câu lập trình chưa được kiểm tra đề; xác nhận để vẫn xuất bản", unverified);
        pins.forEach(AssignmentQuestion::pin);
        item.publish();
        if (!unverified.isEmpty()) audit.record(actorId, "assignment.publish_unverified", "assignment", id, null,
                Map.of("question_ids", unverified));
        audit.record(actorId, "assignment.publish", "assignment", id, Map.of("is_published", false),
                Map.of("is_published", true, "question_count", rows.size()));
        return reader.details(item);
    }

    private LmsException blocked(String code, String message, List<Long> questionIds) {
        return new LmsException(code, message, HttpStatus.CONFLICT, Map.of("question_ids", questionIds));
    }

    private LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
