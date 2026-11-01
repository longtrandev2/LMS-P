package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AttemptSessionDtos.*;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.SessionAnswerRepository;

/**
 * Dựng response phiên làm bài — docs/api-spec.md §7 (`SessionClock`, `AttemptSessionSummary`, `AttemptSessionView`).
 * Câu hỏi theo "đề cho sinh viên" (§6): không bao giờ có đáp án, giải thích hay test ẩn. Gọi trong giao dịch.
 */
@Component
@RequiredArgsConstructor
public class AttemptSessionAssembler {
    private final SessionPaper paper;
    private final SessionAnswerRepository answers;
    private final QuestionVersionService snapshots;
    private final QuestionPaperMapper mapper;
    private final QuizAttemptService quizAttempts;

    public SessionClock clock(AttemptSession session, LocalDateTime now, LocalDateTime savedAt, Integer focusLostCount) {
        return new SessionClock(savedAt, now, session.getEndsAt(), session.remainingSeconds(now), focusLostCount);
    }

    public AttemptSessionSummary summary(AttemptSession session, LocalDateTime now) {
        AssignmentAttempt attempt = session.getAssignmentAttempt();
        QuizAttemptView view = attempt == null ? null : quizAttempts.attemptView(attempt, session.getAssignment(), false);
        return new AttemptSessionSummary(session.getId(), session.getAssignmentId(), session.getAttemptNo(),
                session.getStatus(), session.getPaper().getCode(), session.getStartedAt(), session.getEndsAt(), now,
                session.remainingSeconds(now), session.getSubmittedAt(), session.getSubmitReason(),
                session.getFocusLostCount(), view);
    }

    /** Phiên đã nộp: `sections`/`answers` rỗng (đề chỉ xem lại qua trang xem lại theo `review_mode`). */
    public AttemptSessionView view(AttemptSession session, LocalDateTime now) {
        Assignment assignment = session.getAssignment();
        List<SessionSection> sections = List.of();
        List<SavedAnswer> saved = List.of();
        if (session.isInProgress()) {
            List<AssignmentQuestion> ordered = paper.questions(session);
            sections = sections(session, assignment, ordered);
            saved = saved(session, ordered);
        }
        return new AttemptSessionView(summary(session, now), assignment.getTitle(), assignment.getCategory(),
                assignment.getTimeLimitMinutes(), assignment.getRulesText(), session.getPaper().getTotalPoints(),
                sections, saved);
    }

    private List<SessionSection> sections(AttemptSession session, Assignment assignment, List<AssignmentQuestion> ordered) {
        PaperShuffler shuffler = PaperShuffler.of(assignment.getId(), session.getStudentId(), session.getAttemptNo());
        List<SessionSection> result = new ArrayList<>();
        int position = 0;
        for (SessionPaper.Group group : paper.groups(session, ordered)) {
            List<AssignmentQuestionView> views = new ArrayList<>();
            for (AssignmentQuestion link : group.questions()) {
                QuestionVersion version = link.getQuestionVersion();
                views.add(mapper.student(link, version.getId(), snapshots.read(version), ++position, shuffler,
                        assignment.isShuffleOptions()));
            }
            result.add(new SessionSection(group.title(), views));
        }
        return result;
    }

    private List<SavedAnswer> saved(AttemptSession session, List<AssignmentQuestion> ordered) {
        Map<Long, AssignmentQuestion> byId = ordered.stream()
                .collect(Collectors.toMap(AssignmentQuestion::getId, Function.identity(), (left, right) -> left));
        return answers.findAllBySession_Id(session.getId()).stream()
                .filter(row -> byId.containsKey(row.getAssignmentQuestionId()))
                .map(row -> new SavedAnswer(byId.get(row.getAssignmentQuestionId()).getQuestionId(), row.getResponse(),
                        row.getLanguage(), row.getSourceCode(), row.getUpdatedAt()))
                .toList();
    }
}
