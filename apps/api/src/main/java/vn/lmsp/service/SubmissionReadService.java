package vn.lmsp.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.GradingDtos.ResultView;
import vn.lmsp.dto.GradingDtos.SubmissionDetails;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.dto.ReviewDtos.CorrectAnswer;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.mapper.ReviewMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.GradingResultRepository;
import vn.lmsp.repository.SubmissionRepository;
import vn.lmsp.repository.TestResultRepository;

/** `GET /submissions/{id}` — `SubmissionDetails` theo vai trò (docs/api-spec.md §6). */
@Service
@RequiredArgsConstructor
public class SubmissionReadService {
    private final SubmissionRepository submissions;
    private final GradingResultRepository results;
    private final TestResultRepository tests;
    private final AssignmentAccess access;
    private final QuestionVersionService snapshots;
    private final ReviewPolicy reviews;
    private final GradingMapper mapper;
    private final ReviewMapper answers;

    @Transactional(readOnly = true)
    public SubmissionDetails get(Long id, Long actor, boolean lecturer, boolean admin) {
        var submission = submissions.findById(id).orElseThrow(() ->
                new LmsException("NOT_FOUND", "Không tìm thấy bài nộp", HttpStatus.NOT_FOUND, null));
        boolean own = submission.getStudentId().equals(actor);
        boolean privileged = !own && (admin || lecturer);
        Assignment assignment;
        if (privileged) assignment = access.lecturerAssignment(submission.getAssignmentId(), actor, admin, false);
        else if (own) assignment = access.studentAssignment(submission.getAssignmentId(), actor, false);
        else throw new LmsException("FORBIDDEN", "Bạn không có quyền xem bài nộp này", HttpStatus.FORBIDDEN, null);
        var snapshot = snapshots.read(submission.getQuestionVersion());
        List<ResultView> history = List.of();
        if (submission.getType() == SubmissionType.code) {
            List<TestCaseView> cases = snapshot.test_cases();
            history = results.findAllBySubmission_IdOrderByAttemptNoDesc(id).stream()
                    .map(item -> mapper.toResult(item, tests.findAllByResult_IdOrderByPositionAsc(item.getId()), cases, privileged))
                    .toList();
        }
        boolean reviewAvailable = privileged || reviews.available(assignment, submission.getSubmittedAt(), UtcTime.now());
        boolean shows = submission.getType() == SubmissionType.mcq
                && (privileged || reviews.showsAnswers(assignment, reviewAvailable));
        CorrectAnswer correct = shows ? answers.correctAnswer(snapshot) : null;
        return mapper.toDetails(submission, history, reviewAvailable, correct, shows ? snapshot.explanation() : null);
    }
}
