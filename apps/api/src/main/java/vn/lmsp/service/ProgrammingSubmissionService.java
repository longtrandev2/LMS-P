package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.QuestionSubmissionInput;
import vn.lmsp.dto.GradingDtos.Accepted;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/**
 * Nộp bài code — docs/assessment-spec.md §5. Khi nộp chỉ kiểm tra ngôn ngữ thuộc snapshot và code không rỗng
 * ≤ 128 KiB; kiểm tra đầy đủ đề chỉ chạy lúc xuất bản. Submission `failed` không tính vào `max_attempts`.
 */
@Service
@RequiredArgsConstructor
public class ProgrammingSubmissionService {
    public record Receipt(Accepted accepted, boolean replayed) { }
    private static final int MAX_SOURCE_BYTES = 128 * 1024;
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final UserRepository users;
    private final QuestionVersionService snapshots;
    private final SubmissionPolicy policy;
    private final GradingMapper mapper;
    private final AuditService audit;
    private final MaintenanceGuard maintenance;

    @Transactional
    public Receipt submit(Long assignmentId, Long questionId, Long studentId, String rawKey, QuestionSubmissionInput body) {
        maintenance.check(false);
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        if (assignment.isSessionBased()) throw AssignmentSubmissionService.sessionOnly();
        String key = policy.key(rawKey);
        validateBody(body);
        var old = submissions.findByIdempotencyKey(key);
        if (old.isPresent()) {
            Submission item = old.get();
            if (!Objects.equals(item.getAssignmentId(), assignmentId) || !Objects.equals(item.getQuestionId(), questionId)
                    || !Objects.equals(item.getStudentId(), studentId) || !Objects.equals(item.getLanguage(), body.language())
                    || !Objects.equals(item.getSourceCode(), body.source_code())) throw policy.idempotencyConflict();
            return new Receipt(mapper.toAccepted(item), true);
        }
        if (assignment.getCategory() == AssignmentCategory.QUIZ) throw invalid("Quiz không nhận bài nộp code");
        var link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId)
                .orElseThrow(() -> invalid("Câu hỏi không thuộc bài này"));
        if (link.getQuestionVersion() == null) throw invalid("Câu hỏi không phải đề lập trình đã xuất bản");
        var snapshot = snapshots.read(link.getQuestionVersion());
        if (snapshot.type() != QuestionType.programming || snapshot.programming() == null)
            throw invalid("Câu hỏi không phải đề lập trình đã xuất bản");
        List<String> languages = snapshot.programming().allowed_languages();
        if (languages == null || !languages.contains(body.language()))
            throw invalid("Ngôn ngữ không được phép trong phiên bản đề này");
        var now = UtcTime.now();
        var window = policy.window(assignment, now);
        long used = submissions.countByAssignment_IdAndStudent_IdAndQuestion_IdAndStatusNot(assignmentId, studentId,
                questionId, SubmissionStatus.failed);
        policy.requireAttemptLeft(assignment, used, "Bạn đã dùng hết số lượt nộp câu hỏi");
        int attemptNo = submissions.maxAttemptNo(assignmentId, studentId, questionId) + 1;
        User student = users.findById(studentId).orElseThrow(() -> invalid("Không tìm thấy sinh viên"));
        Submission submission = submissions.saveAndFlush(Submission.programming(student, assignment, link, attemptNo,
                body.language(), body.source_code(), window.late(), window.penalty(), key, now));
        jobs.save(new GradingJob(submission, 5, now));
        audit.record(studentId, "submission.create", "submission", submission.getId(), null,
                Map.of("assignment_id", assignmentId, "question_id", questionId, "language", body.language()));
        return new Receipt(mapper.toAccepted(submission), false);
    }

    private void validateBody(QuestionSubmissionInput body) {
        if (body == null || body.language() == null || !List.of("python", "c", "cpp", "java").contains(body.language())
                || body.source_code() == null || body.source_code().isBlank()
                || body.source_code().getBytes(StandardCharsets.UTF_8).length > MAX_SOURCE_BYTES)
            throw invalid("Cần ngôn ngữ hợp lệ và mã nguồn không rỗng, tối đa 128KiB");
        if (body.hasAnswerFields()) throw invalid("Bài code không kèm câu trả lời trắc nghiệm (MCQ)");
    }
    private LmsException invalid(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
