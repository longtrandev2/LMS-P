package vn.lmsp.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.QuestionSubmissionInput;
import vn.lmsp.dto.GradingDtos.Accepted;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

@Service
public class ProgrammingSubmissionService {
    public record Receipt(Accepted accepted, boolean replayed) { }
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final UserRepository users;
    private final QuestionVersionService snapshots;
    private final SubmissionPolicy policy;
    private final GradingScoreService scores;
    private final GradingMapper mapper;
    private final AuditService audit;

    public ProgrammingSubmissionService(AssignmentAccess access, AssignmentQuestionRepository links,
            SubmissionRepository submissions, GradingJobRepository jobs, UserRepository users,
            QuestionVersionService snapshots, SubmissionPolicy policy, GradingScoreService scores,
            GradingMapper mapper, AuditService audit) {
        this.access = access; this.links = links; this.submissions = submissions; this.jobs = jobs; this.users = users;
        this.snapshots = snapshots; this.policy = policy; this.scores = scores; this.mapper = mapper; this.audit = audit;
    }

    @Transactional
    public Receipt submit(Long assignmentId, Long questionId, Long studentId, String rawKey, QuestionSubmissionInput body) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        String key = policy.key(rawKey);
        validateBody(body);
        var old = submissions.findByIdempotencyKey(key);
        if (old.isPresent()) {
            Submission item = old.get();
            if (!Objects.equals(item.getAssignmentId(), assignmentId) || !Objects.equals(item.getQuestionId(), questionId)
                    || !Objects.equals(item.getStudentId(), studentId) || !Objects.equals(item.getLanguage(), body.language())
                    || !Objects.equals(item.getSourceCode(), body.source_code())) throw conflict("Idempotency-Key đã dùng cho nội dung khác");
            return new Receipt(mapper.toAccepted(item), true);
        }
        if (assignment.getCategory() == AssignmentCategory.QUIZ) throw invalid("Quiz chỉ nhận đáp án MCQ theo toàn bài");
        var link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId)
                .orElseThrow(() -> invalid("Câu hỏi không thuộc bài này"));
        if (link.getQuestionVersion() == null || link.getQuestion().getType() != QuestionType.programming)
            throw invalid("Câu hỏi không phải đề lập trình đã xuất bản");
        var snapshot = snapshots.read(link.getQuestionVersion());
        try { scores.validateProblem(snapshot); } catch (IllegalArgumentException error) { throw invalid(error.getMessage()); }
        if (snapshot.programming().allowed_languages() == null || !snapshot.programming().allowed_languages().contains(body.language()))
            throw invalid("Ngôn ngữ không được phép trong phiên bản đề này");
        var now = LocalDateTime.now();
        var window = policy.window(assignment, now);
        long count = submissions.countByAssignment_IdAndStudent_IdAndQuestion_Id(assignmentId, studentId, questionId);
        if (assignment.getMaxAttempts() != null && count >= assignment.getMaxAttempts())
            throw new LmsException("ATTEMPT_EXCEEDED", "Bạn đã dùng hết số lượt nộp câu hỏi", HttpStatus.CONFLICT, null);
        User student = users.findById(studentId).orElseThrow(() -> invalid("Không tìm thấy sinh viên"));
        Submission submission = submissions.saveAndFlush(Submission.programming(student, assignment, link, (int) count + 1,
                body.language(), body.source_code(), window.late(), window.penalty(), key, now));
        jobs.save(new GradingJob(submission, 5, now));
        audit.record(studentId, "submission.create", "submission", submission.getId(), null,
                java.util.Map.of("assignment_id", assignmentId, "question_id", questionId, "language", body.language()));
        return new Receipt(mapper.toAccepted(submission), false);
    }

    private void validateBody(QuestionSubmissionInput body) {
        if (body == null || body.language() == null || !List.of("python", "c", "cpp", "java").contains(body.language())
                || body.source_code() == null || body.source_code().isBlank()
                || body.source_code().getBytes(StandardCharsets.UTF_8).length > 128 * 1024)
            throw invalid("Cần ngôn ngữ hợp lệ và mã nguồn không rỗng, tối đa 128KiB");
        if (body.selected_option_ids() != null && !body.selected_option_ids().isEmpty())
            throw invalid("Bài code không kèm lựa chọn MCQ");
    }
    private LmsException invalid(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
    private LmsException conflict(String message) {
        return new LmsException("IDEMPOTENCY_CONFLICT", message, HttpStatus.CONFLICT, null);
    }
}
