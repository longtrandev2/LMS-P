package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AttemptSession;

/**
 * Chạy thử test mẫu trong phòng thi — `POST /attempt-sessions/{id}/questions/{qid}/run` (docs/api-spec.md §7,
 * docs/exam-spec.md §8.1): chỉ khi phiên còn mở và câu là câu lập trình thuộc đề của phiên.
 */
@Service
@RequiredArgsConstructor
public class SessionPracticeRunService {
    private final SessionAccess access;
    private final SessionPaper paper;
    private final PracticeRunService practice;

    @Transactional
    public RunAccepted run(Long sessionId, Long questionId, Long studentId, PracticeRunInput input) {
        AttemptSession session = access.ownSession(sessionId, studentId, false);
        if (!session.acceptsWrites(UtcTime.now())) throw SessionAccess.ended();
        AssignmentQuestion link = paper.questions(session).stream()
                .filter(item -> item.getQuestionId().equals(questionId)).findFirst()
                .orElseThrow(() -> SessionAccess.invalid("Câu hỏi không thuộc đề của phiên này"));
        return practice.runPinned(link, studentId, input);
    }
}
