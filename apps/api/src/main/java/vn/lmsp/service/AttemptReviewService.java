package vn.lmsp.service;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.ReviewDtos.AttemptReview;
import vn.lmsp.dto.ReviewDtos.ReviewQuestion;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.mapper.ReviewMapper;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentAttempt;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.model.Submission;
import vn.lmsp.repository.AssignmentAttemptRepository;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.SubmissionRepository;
import vn.lmsp.service.AssignmentReadService.PaperItem;

/**
 * `GET /assignments/{id}/quiz-attempts/{attemptId}` — xem lại một lượt theo chính sách (docs/assessment-spec.md §6).
 * Quiz thường: câu theo thứ tự lượt đó đã thấy (seed với n = attempt_no). Bài giao theo phiên (quiz có giờ, kỳ thi):
 * đúng câu và thứ tự `question_order` của phiên; câu lập trình kèm bài nộp/verdict (docs/exam-spec.md §6).
 */
@Service
@RequiredArgsConstructor
public class AttemptReviewService {
    private final AssignmentAccess access;
    private final AssignmentAttemptRepository attempts;
    private final AssignmentQuestionRepository links;
    private final SubmissionRepository submissions;
    private final AssignmentReadService reader;
    private final QuizAttemptService quizzes;
    private final ReviewPolicy reviews;
    private final ReviewMapper mapper;
    private final AttemptSessionRepository sessions;
    private final SessionPaperReader sessionPapers;

    @Transactional(readOnly = true)
    public AttemptReview review(Long assignmentId, Long attemptId, Long actorId, boolean student, boolean admin) {
        Assignment assignment = student ? access.studentAssignment(assignmentId, actorId, false)
                : access.lecturerAssignment(assignmentId, actorId, admin, false);
        if (assignment.getCategory() != AssignmentCategory.QUIZ && !assignment.isSessionBased()) throw notFound();
        AssignmentAttempt attempt = attempts.findByIdAndAssignment_Id(attemptId, assignmentId).orElseThrow(this::notFound);
        if (student && !attempt.getStudentId().equals(actorId)) throw notFound();
        boolean available = !student || reviews.available(assignment, attempt.getSubmittedAt(), UtcTime.now());
        boolean shows = !student || reviews.showsAnswers(assignment, available);
        var view = quizzes.attemptView(attempt, assignment, !student);
        if (!available) return new AttemptReview(view, false, false, List.of());
        var answers = SubmissionMapper.byQuestion(submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(attempt.getId()));
        List<ReviewQuestion> questions = paper(assignment, attempt).stream()
                .map(item -> question(item, answers, shows)).toList();
        return new AttemptReview(view, true, shows, questions);
    }

    private List<PaperItem> paper(Assignment assignment, AssignmentAttempt attempt) {
        AttemptSession session = assignment.isSessionBased()
                ? sessions.findByAssignmentAttempt_Id(attempt.getId()).orElse(null) : null;
        if (session != null) return sessionPapers.paper(assignment, session);
        return reader.paper(assignment, links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId()),
                attempt.getStudentId(), attempt.getAttemptNo());
    }

    private ReviewQuestion question(PaperItem item, Map<Long, Submission> answers, boolean shows) {
        Submission answer = answers.get(item.link().getQuestionId());
        ReviewQuestion base = mapper.toReviewQuestion(item.view(), item.snapshot(), answer, item.link().getPoints(), shows);
        if (answer == null || answer.getType() != SubmissionType.code) return base;
        return new ReviewQuestion(base.question(), null, answer.getScore(), base.max_score(), base.correct_answer(),
                base.explanation(), answer.getId(), answer.getStatus(), answer.getVerdict());
    }

    private LmsException notFound() {
        return new LmsException("NOT_FOUND", "Không tìm thấy lượt làm bài", HttpStatus.NOT_FOUND, null);
    }
}
