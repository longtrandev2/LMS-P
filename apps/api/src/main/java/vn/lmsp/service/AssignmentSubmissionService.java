package vn.lmsp.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AssignmentSubmissionService {
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final AssignmentAttemptRepository attempts;
    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final QuestionVersionService snapshots;
    private final SubmissionMapper mapper;
    private final AuditService audit;
    public AssignmentSubmissionService(AssignmentAccess access, AssignmentQuestionRepository links,
            AssignmentAttemptRepository attempts, SubmissionRepository submissions, UserRepository users,
            QuestionVersionService snapshots, SubmissionMapper mapper, AuditService audit) {
        this.access = access; this.links = links; this.attempts = attempts; this.submissions = submissions;
        this.users = users; this.snapshots = snapshots; this.mapper = mapper; this.audit = audit;
    }
    @Transactional
    public QuizAttemptView submitQuiz(Long assignmentId, Long studentId, String rawKey, QuizSubmitInput body) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        if (assignment.getCategory() != AssignmentCategory.QUIZ) throw bad("Bài này không phải quiz");
        String key = idempotencyKey(rawKey);
        var old = attempts.findByIdempotencyKey(key);
        if (old.isPresent()) { ensureAttemptOwner(old.get(), assignmentId, studentId); return attemptView(old.get()); }
        SubmissionWindow window = window(assignment, LocalDateTime.now());
        long count = attempts.countByAssignment_IdAndStudent_Id(assignmentId, studentId);
        if (assignment.getMaxAttempts() != null && count >= assignment.getMaxAttempts()) throw conflict("Bạn đã dùng hết số lượt làm quiz");
        List<AssignmentQuestion> questionLinks = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId);
        Map<Long, QuizAnswerInput> answerMap = answerMap(body, questionLinks);
        List<PendingAnswer> pending = questionLinks.stream().map(link -> score(link, answerMap.get(link.getQuestionId()), window.penalty())).toList();
        BigDecimal total = pending.stream().map(PendingAnswer::score).reduce(BigDecimal.ZERO, BigDecimal::add);
        AssignmentAttempt attempt = attempts.saveAndFlush(new AssignmentAttempt(assignment, user(studentId), (int) count + 1,
                window.late(), window.penalty(), total, key, LocalDateTime.now()));
        for (PendingAnswer row : pending) submissions.save(new Submission(user(studentId), assignment, attempt, row.link(),
                row.selected(), attempt.getAttemptNo(), row.score(), window.late(), null, attempt.getSubmittedAt()));
        audit.record(studentId, "quiz.submit", "assignment", assignmentId, null,
                Map.of("attempt_no", attempt.getAttemptNo(), "score", total, "is_late", window.late()));
        return attemptView(attempt);
    }
    @Transactional(readOnly = true)
    public List<QuizAttemptView> quizHistory(Long assignmentId, Long studentId) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, false);
        if (assignment.getCategory() != AssignmentCategory.QUIZ) throw bad("Bài này không phải quiz");
        return attempts.findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(assignmentId, studentId).stream().map(this::attemptView).toList();
    }
    @Transactional
    public SubmissionView submitQuestion(Long assignmentId, Long questionId, Long studentId, String rawKey, QuestionSubmissionInput body) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, true);
        if (assignment.getCategory() == AssignmentCategory.QUIZ) throw bad("Quiz phải nộp toàn bộ đáp án trong một lượt");
        AssignmentQuestion link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId).orElseThrow(() -> bad("Câu hỏi không thuộc bài này"));
        if (link.getQuestion().getType() != QuestionType.mcq) throw unavailable("Nộp bài lập trình cần worker chấm code");
        String key = idempotencyKey(rawKey); var old = submissions.findByIdempotencyKey(key);
        if (old.isPresent()) { ensureSubmissionOwner(old.get(), assignmentId, questionId, studentId); return mapper.toView(old.get()); }
        SubmissionWindow window = window(assignment, LocalDateTime.now());
        long count = submissions.countByAssignment_IdAndStudent_IdAndQuestion_Id(assignmentId, studentId, questionId);
        if (assignment.getMaxAttempts() != null && count >= assignment.getMaxAttempts()) throw conflict("Bạn đã dùng hết số lượt nộp câu hỏi");
        List<Long> selected = body == null ? null : body.selected_option_ids();
        PendingAnswer scored = score(link, new QuizAnswerInput(questionId, selected), window.penalty());
        Submission row = submissions.save(new Submission(user(studentId), assignment, null, link, scored.selected(), (int) count + 1,
                scored.score(), window.late(), key, LocalDateTime.now()));
        return mapper.toView(row);
    }
    @Transactional(readOnly = true)
    public void runQuestion(Long assignmentId, Long questionId, Long studentId) {
        Assignment assignment = access.studentAssignment(assignmentId, studentId, false);
        AssignmentQuestion link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId).orElseThrow(() -> bad("Câu hỏi không thuộc bài này"));
        if (link.getQuestion().getType() != QuestionType.programming) throw bad("Chỉ có thể chạy thử câu hỏi lập trình");
        throw unavailable("Chạy thử cần worker sandbox; worker hiện chưa có bộ chạy code.");
    }
    @Transactional(readOnly = true)
    public List<SubmissionView> mySubmissions(Long assignmentId, Long studentId) {
        access.studentAssignment(assignmentId, studentId, false);
        return submissions.findAllByAssignment_IdAndStudent_IdOrderBySubmittedAtDesc(assignmentId, studentId).stream().map(mapper::toView).toList();
    }
    @Transactional(readOnly = true)
    public List<SubmissionView> lecturerSubmissions(Long assignmentId, Long actorId, boolean admin) {
        access.lecturerAssignment(assignmentId, actorId, admin, false);
        return submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(assignmentId).stream().map(mapper::toView).toList();
    }
    private QuizAttemptView attemptView(AssignmentAttempt attempt) {
        var answers = submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(attempt.getId());
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(attempt.getAssignmentId());
        return mapper.toAttemptView(attempt, questions, answers);
    }
    private Map<Long, QuizAnswerInput> answerMap(QuizSubmitInput body, List<AssignmentQuestion> assigned) {
        Set<Long> allowed = assigned.stream().map(AssignmentQuestion::getQuestionId).collect(java.util.stream.Collectors.toSet());
        Map<Long, QuizAnswerInput> result = new HashMap<>();
        if (body == null || body.answers() == null) return result;
        for (QuizAnswerInput row : body.answers()) {
            if (!allowed.contains(row.question_id())) throw bad("Yêu cầu chứa câu hỏi không thuộc quiz");
            if (result.putIfAbsent(row.question_id(), row) != null) throw bad("Một câu hỏi không thể xuất hiện hai lần trong cùng lượt");
        }
        return result;
    }
    private PendingAnswer score(AssignmentQuestion link, QuizAnswerInput answer, int penalty) {
        QuestionSnapshot snapshot = snapshot(link);
        List<Long> selected = answer == null || answer.selected_option_ids() == null ? List.of() : answer.selected_option_ids();
        if (selected.size() > 1 || new HashSet<>(selected).size() != selected.size()) throw bad("MCQ v1 chỉ nhận tối đa một lựa chọn");
        Long optionId = selected.isEmpty() ? null : selected.get(0);
        var option = optionId == null ? null : snapshot.options().stream().filter(o -> Objects.equals(o.id(), optionId)).findFirst()
                .orElseThrow(() -> bad("Lựa chọn không thuộc câu hỏi này"));
        BigDecimal raw = option != null && Boolean.TRUE.equals(option.is_correct()) ? link.getPoints() : BigDecimal.ZERO;
        BigDecimal factor = BigDecimal.valueOf(100 - penalty).movePointLeft(2);
        BigDecimal score = raw.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        return new PendingAnswer(link, optionId == null ? null : List.of(optionId), score);
    }
    private QuestionSnapshot snapshot(AssignmentQuestion link) {
        if (link.getQuestionVersion() == null) throw conflict("Bài chưa được xuất bản");
        return snapshots.read(link.getQuestionVersion());
    }
    private SubmissionWindow window(Assignment assignment, LocalDateTime now) {
        if (assignment.getAvailableFrom() != null && now.isBefore(assignment.getAvailableFrom())) throw conflict("Bài chưa mở");
        if (!now.isAfter(assignment.getDueAt())) return new SubmissionWindow(false, 0);
        if (!assignment.isAllowLate() || assignment.getLateDueAt() == null || now.isAfter(assignment.getLateDueAt())) throw conflict("Đã hết hạn nộp bài");
        return new SubmissionWindow(true, assignment.getLatePenaltyPercent());
    }
    private String idempotencyKey(String key) {
        if (key == null || !key.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) throw bad("Idempotency-Key phải là UUID hợp lệ");
        return key.toLowerCase(Locale.ROOT);
    }
    private void ensureAttemptOwner(AssignmentAttempt old, Long assignmentId, Long studentId) {
        if (!old.getAssignmentId().equals(assignmentId) || !old.getStudentId().equals(studentId)) throw conflict("Idempotency-Key đã được dùng cho yêu cầu khác");
    }
    private void ensureSubmissionOwner(Submission old, Long assignmentId, Long questionId, Long studentId) {
        if (!old.getAssignmentId().equals(assignmentId) || !old.getQuestionId().equals(questionId) || !old.getStudentId().equals(studentId)) throw conflict("Idempotency-Key đã được dùng cho yêu cầu khác");
    }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
    private LmsException conflict(String message) { return new LmsException("CONFLICT", message, HttpStatus.CONFLICT, null); }
    private LmsException unavailable(String message) { return new LmsException("RUNNER_UNAVAILABLE", message, HttpStatus.NOT_IMPLEMENTED, null); }
    private record PendingAnswer(AssignmentQuestion link, List<Long> selected, BigDecimal score) { }
    private record SubmissionWindow(boolean late, int penalty) { }
}
