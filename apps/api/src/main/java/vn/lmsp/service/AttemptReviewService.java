package vn.lmsp.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.ReviewDtos.AttemptReview;
import vn.lmsp.dto.ReviewDtos.ReviewQuestion;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.mapper.ReviewMapper;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentAttempt;
import vn.lmsp.repository.AssignmentAttemptRepository;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.SubmissionRepository;

/**
 * `GET /assignments/{id}/quiz-attempts/{attemptId}` — xem lại một lượt theo chính sách (docs/assessment-spec.md §6).
 * Câu hiện theo đúng thứ tự lượt đó đã thấy (seed với n = attempt_no).
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

    @Transactional(readOnly = true)
    public AttemptReview review(Long assignmentId, Long attemptId, Long actorId, boolean student, boolean admin) {
        Assignment assignment = student ? access.studentAssignment(assignmentId, actorId, false)
                : access.lecturerAssignment(assignmentId, actorId, admin, false);
        if (assignment.getCategory() != AssignmentCategory.QUIZ) throw notFound();
        AssignmentAttempt attempt = attempts.findByIdAndAssignment_Id(attemptId, assignmentId).orElseThrow(this::notFound);
        if (student && !attempt.getStudentId().equals(actorId)) throw notFound();
        boolean available = !student || reviews.available(assignment, attempt.getSubmittedAt(), UtcTime.now());
        boolean shows = !student || reviews.showsAnswers(assignment, available);
        var view = quizzes.attemptView(attempt, assignment, !student);
        if (!available) return new AttemptReview(view, false, false, List.of());
        var answers = SubmissionMapper.byQuestion(submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(attempt.getId()));
        var paper = reader.paper(assignment, links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId),
                attempt.getStudentId(), attempt.getAttemptNo());
        List<ReviewQuestion> questions = paper.stream().map(item -> mapper.toReviewQuestion(item.view(), item.snapshot(),
                answers.get(item.link().getQuestionId()), item.link().getPoints(), shows)).toList();
        return new AttemptReview(view, true, shows, questions);
    }

    private LmsException notFound() {
        return new LmsException("NOT_FOUND", "Không tìm thấy lượt làm bài", HttpStatus.NOT_FOUND, null);
    }
}
