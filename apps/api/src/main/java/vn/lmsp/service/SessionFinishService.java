package vn.lmsp.service;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionSummary;
import vn.lmsp.dto.AttemptSessionDtos.FinishInput;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.AttemptSession;

/**
 * Sinh viên nộp phiên — docs/exam-spec.md §5.6: lưu `answers` gửi kèm rồi nộp. Phiên đã nộp → trả kết quả cũ
 * (idempotent); quá ân hạn → 409 `SESSION_ENDED` (scheduler sẽ tự nộp bằng bài đã lưu).
 */
@Service
@RequiredArgsConstructor
public class SessionFinishService {
    private final SessionAccess access;
    private final SessionAnswerService answers;
    private final SessionSubmitter submitter;
    private final AttemptSessionAssembler assembler;

    @Transactional
    public AttemptSessionSummary finish(Long sessionId, Long studentId, FinishInput body) {
        LocalDateTime now = UtcTime.now();
        AttemptSession session = access.ownSession(sessionId, studentId, true);
        if (!session.isInProgress()) return assembler.summary(session, now);
        if (!session.acceptsWrites(now)) throw SessionAccess.ended();
        if (body != null) answers.apply(session, body.answers(), now);
        session.touch(now);
        AttemptSession submitted = submitter.submit(sessionId, SubmitReason.manual, studentId);
        return assembler.summary(submitted, UtcTime.now());
    }
}
