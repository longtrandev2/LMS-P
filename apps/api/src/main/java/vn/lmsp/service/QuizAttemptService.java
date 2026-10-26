package vn.lmsp.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AssignmentDtos.QuizSubmitInput;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/** Nộp quiz toàn bài và lịch sử lượt — docs/api-spec.md §6, docs/assessment-spec.md §3, §6. */
@Service
@RequiredArgsConstructor
public class QuizAttemptService {
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final AssignmentAttemptRepository attempts;
    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final QuestionVersionService snapshots;
    private final SubmissionMapper mapper;
    private final AuditService audit;
    private final SubmissionPolicy policy;
    private final AnswerNormalizer normalizer;
    private final ObjectiveGrader grader;
    private final ReviewPolicy reviews;

    @Transactional
    public QuizAttemptView submitQuiz(Long assignmentId, Long studentId, String rawKey, QuizSubmitInput body) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        if (assignment.getCategory() != AssignmentCategory.QUIZ) throw bad("Bài này không phải quiz");
        String key = policy.key(rawKey);
        List<AssignmentQuestion> questionLinks = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId);
        Map<Long, QuestionSnapshot> papers = new HashMap<>();
        for (AssignmentQuestion link : questionLinks) papers.put(link.getQuestionId(), snapshot(link));
        Map<Long, AnswerResponse> responses = normalize(body, papers);
        var old = attempts.findByIdempotencyKey(key);
        if (old.isPresent()) return replay(old.get(), assignment, studentId, responses);
        LocalDateTime now = UtcTime.now();
        SubmissionPolicy.Window window = policy.window(assignment, now);
        long count = attempts.countByAssignment_IdAndStudent_Id(assignmentId, studentId);
        policy.requireAttemptLeft(assignment, count, "Bạn đã dùng hết số lượt làm quiz");
        Map<Long, BigDecimal> scores = new HashMap<>();
        for (AssignmentQuestion link : questionLinks) {
            QuestionSnapshot snapshot = papers.get(link.getQuestionId());
            BigDecimal fraction = grader.fraction(snapshot, responses.get(link.getQuestionId()));
            scores.put(link.getQuestionId(), grader.score(link.getPoints(), fraction, window.penalty()));
        }
        BigDecimal total = scores.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        User student = user(studentId);
        AssignmentAttempt attempt = attempts.saveAndFlush(new AssignmentAttempt(assignment, student, (int) count + 1,
                window.late(), window.penalty(), total, key, now));
        for (AssignmentQuestion link : questionLinks) submissions.save(new Submission(student, assignment, attempt, link,
                responses.get(link.getQuestionId()), attempt.getAttemptNo(), scores.get(link.getQuestionId()),
                window.late(), null, attempt.getSubmittedAt()));
        audit.record(studentId, "quiz.submit", "assignment", assignmentId, null,
                Map.of("attempt_no", attempt.getAttemptNo(), "score", total, "is_late", window.late()));
        return attemptView(attempt, assignment, false);
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptView> quizHistory(Long assignmentId, Long studentId) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, false);
        if (assignment.getCategory() != AssignmentCategory.QUIZ) throw bad("Bài này không phải quiz");
        return attempts.findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(assignmentId, studentId).stream()
                .map(attempt -> attemptView(attempt, assignment, false)).toList();
    }

    /** `privileged` = giảng viên phụ trách/admin: luôn thấy điểm từng câu. */
    public QuizAttemptView attemptView(AssignmentAttempt attempt, Assignment assignment, boolean privileged) {
        var answers = submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(attempt.getId());
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(attempt.getAssignmentId());
        boolean available = privileged || reviews.available(assignment, attempt.getSubmittedAt(), UtcTime.now());
        return mapper.toAttemptView(attempt, questions, answers, available,
                reviews.availableAt(assignment, attempt.getSubmittedAt()));
    }

    private QuizAttemptView replay(AssignmentAttempt old, Assignment assignment, Long studentId,
                                   Map<Long, AnswerResponse> responses) {
        if (!old.getAssignmentId().equals(assignment.getId()) || !old.getStudentId().equals(studentId))
            throw policy.idempotencyConflict();
        Map<Long, AnswerResponse> stored = new HashMap<>();
        for (Submission row : submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(old.getId())) {
            AnswerResponse response = SubmissionMapper.storedResponse(row);
            if (response != null) stored.put(row.getQuestionId(), response);
        }
        if (!stored.equals(responses)) throw policy.idempotencyConflict();
        return attemptView(old, assignment, false);
    }

    private Map<Long, AnswerResponse> normalize(QuizSubmitInput body, Map<Long, QuestionSnapshot> papers) {
        Map<Long, AnswerResponse> result = new HashMap<>();
        if (body == null || body.answers() == null) return result;
        Set<Long> seen = new HashSet<>();
        for (AnswerInput answer : body.answers()) {
            QuestionSnapshot snapshot = papers.get(answer.question_id());
            if (snapshot == null) throw bad("Yêu cầu chứa câu hỏi không thuộc quiz");
            if (!seen.add(answer.question_id())) throw bad("Một câu hỏi không thể xuất hiện hai lần trong cùng lượt");
            AnswerResponse response = normalizer.normalize(snapshot, answer);
            if (response != null) result.put(answer.question_id(), response);
        }
        return result;
    }

    private QuestionSnapshot snapshot(AssignmentQuestion link) {
        if (link.getQuestionVersion() == null) throw new LmsException("CONFLICT", "Bài chưa được xuất bản", HttpStatus.CONFLICT, null);
        return snapshots.read(link.getQuestionVersion());
    }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
