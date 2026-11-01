package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** Nộp từng câu khách quan và danh sách bài nộp — docs/api-spec.md §6. Bài code: {@link ProgrammingSubmissionService}. */
@Service
@RequiredArgsConstructor
public class AssignmentSubmissionService {
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final QuestionVersionService snapshots;
    private final SubmissionMapper mapper;
    private final SubmissionPolicy policy;
    private final AnswerNormalizer normalizer;
    private final ObjectiveGrader grader;
    private final ReviewPolicy reviews;
    private final MaintenanceGuard maintenance;

    @Transactional
    public SubmissionView submitQuestion(Long assignmentId, Long questionId, Long studentId, String rawKey, QuestionSubmissionInput body) {
        maintenance.check(false);
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        if (assignment.isSessionBased()) throw sessionOnly();
        if (assignment.getCategory() == AssignmentCategory.QUIZ) throw bad("Quiz phải nộp toàn bộ đáp án trong một lượt");
        AssignmentQuestion link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId).orElseThrow(() -> bad("Câu hỏi không thuộc bài này"));
        if (link.getQuestionVersion() == null) throw new LmsException("CONFLICT", "Bài chưa được xuất bản", HttpStatus.CONFLICT, null);
        QuestionSnapshot snapshot = snapshots.read(link.getQuestionVersion());
        if (snapshot.type() == QuestionType.programming) throw bad("Bài lập trình cần language và source_code");
        if (body != null && body.question_id() != null && !body.question_id().equals(questionId))
            throw bad("question_id không khớp với đường dẫn");
        String key = policy.key(rawKey);
        AnswerResponse response = normalizer.normalize(snapshot, body == null ? null : body.toAnswer(questionId));
        var old = submissions.findByIdempotencyKey(key);
        if (old.isPresent()) return replay(old.get(), assignmentId, questionId, studentId, response, assignment);
        LocalDateTime now = UtcTime.now();
        SubmissionPolicy.Window window = policy.window(assignment, now);
        long used = submissions.countByAssignment_IdAndStudent_IdAndQuestion_IdAndStatusNot(assignmentId, studentId,
                questionId, SubmissionStatus.failed);
        policy.requireAttemptLeft(assignment, used, "Bạn đã dùng hết số lượt nộp câu hỏi");
        BigDecimal score = grader.score(link.getPoints(), grader.fraction(snapshot, response), window.penalty());
        int attemptNo = submissions.maxAttemptNo(assignmentId, studentId, questionId) + 1;
        Submission row = submissions.save(new Submission(user(studentId), assignment, null, link, response, attemptNo,
                score, window.late(), key, now));
        return mapper.toView(row, reviews.available(assignment, now, now));
    }

    @Transactional(readOnly = true)
    public List<SubmissionView> mySubmissions(Long assignmentId, Long studentId) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, false);
        LocalDateTime now = UtcTime.now();
        return submissions.findAllByAssignment_IdAndStudent_IdOrderBySubmittedAtDesc(assignmentId, studentId).stream()
                .map(row -> mapper.toView(row, reviews.available(assignment, row.getSubmittedAt(), now))).toList();
    }

    /** Lọc theo `question_id`, `status`, `verdict`, `q` (tên/mã/email sinh viên). */
    @Transactional(readOnly = true)
    public List<SubmissionView> lecturerSubmissions(Long assignmentId, Long actorId, boolean admin, Long questionId,
                                                    SubmissionStatus status, GradingVerdict verdict, String query) {
        access.lecturerAssignment(assignmentId, actorId, admin, false);
        String q = query == null || query.isBlank() ? null : query.strip().toLowerCase(Locale.ROOT);
        return submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(assignmentId).stream()
                .filter(row -> questionId == null || questionId.equals(row.getQuestionId()))
                .filter(row -> status == null || status == row.getStatus())
                .filter(row -> verdict == null || verdict == row.getVerdict())
                .filter(row -> q == null || matches(row, q))
                .map(row -> mapper.toView(row, true)).toList();
    }

    private SubmissionView replay(Submission old, Long assignmentId, Long questionId, Long studentId,
                                  AnswerResponse response, Assignment assignment) {
        if (!old.getAssignmentId().equals(assignmentId) || !old.getQuestionId().equals(questionId)
                || !old.getStudentId().equals(studentId) || !Objects.equals(SubmissionMapper.storedResponse(old), response))
            throw policy.idempotencyConflict();
        return mapper.toView(old, reviews.available(assignment, old.getSubmittedAt(), UtcTime.now()));
    }

    private boolean matches(Submission row, String q) {
        User student = row.getStudent();
        return contains(student.getFullName(), q) || contains(student.getStudentCode(), q) || contains(student.getEmail(), q);
    }
    private boolean contains(String value, String q) { return value != null && value.toLowerCase(Locale.ROOT).contains(q); }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
    /** Bài giao theo phiên chỉ nộp qua phiên làm bài — docs/exam-spec.md §1. */
    static LmsException sessionOnly() {
        return new LmsException("CONFLICT", "Bài này làm theo phiên — hãy bắt đầu phiên làm bài", HttpStatus.CONFLICT, null);
    }
}
