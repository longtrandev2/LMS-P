package vn.lmsp.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.*;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.model.SessionAnswer;
import vn.lmsp.repository.SessionAnswerRepository;

/**
 * Tự lưu câu trả lời của phiên — docs/exam-spec.md §5.4. Câu khách quan chuẩn hóa như khi nộp; câu lập trình lưu
 * `{language, source_code}` (≤ 128 KiB, được phép rỗng). Không gửi `answer` lẫn `code` = xóa câu đã lưu.
 */
@Service
@RequiredArgsConstructor
public class SessionAnswerService {
    static final int MAX_ITEMS = 50;
    static final int MAX_SOURCE_BYTES = 128 * 1024;
    private final SessionAccess access;
    private final SessionPaper paper;
    private final SessionAnswerRepository answers;
    private final QuestionVersionService snapshots;
    private final AnswerNormalizer normalizer;
    private final AttemptSessionAssembler assembler;
    private final ExamRealtimeSignals signals;

    @Transactional
    public SessionClock save(Long sessionId, Long studentId, SaveAnswersInput body) {
        LocalDateTime now = UtcTime.now();
        AttemptSession session = access.ownSession(sessionId, studentId, true);
        if (!session.acceptsWrites(now)) throw SessionAccess.ended();
        apply(session, body == null ? null : body.answers(), now);
        session.touch(now);
        signals.saved(session);
        return assembler.clock(session, now, now, null);
    }

    /** Upsert từng câu; caller đã khóa phiên và kiểm tra phiên còn nhận ghi. */
    public void apply(AttemptSession session, List<SessionAnswerInput> inputs, LocalDateTime now) {
        if (inputs == null || inputs.isEmpty()) return;
        if (inputs.size() > MAX_ITEMS) throw SessionAccess.invalid("Tối đa " + MAX_ITEMS + " câu mỗi lần lưu");
        Map<Long, AssignmentQuestion> byQuestion = paper.questions(session).stream()
                .collect(Collectors.toMap(AssignmentQuestion::getQuestionId, Function.identity(), (left, right) -> left));
        Map<Long, SessionAnswer> stored = answers.findAllBySession_Id(session.getId()).stream()
                .collect(Collectors.toMap(SessionAnswer::getAssignmentQuestionId, Function.identity(), (left, right) -> left));
        Set<Long> seen = new HashSet<>();
        for (SessionAnswerInput input : inputs) {
            AssignmentQuestion link = byQuestion.get(input.question_id());
            if (link == null) throw SessionAccess.invalid("Câu hỏi không thuộc đề của phiên này");
            if (!seen.add(input.question_id())) throw SessionAccess.invalid("Một câu hỏi xuất hiện hai lần trong cùng yêu cầu");
            QuestionSnapshot snapshot = snapshots.read(link.getQuestionVersion());
            SessionAnswer row = stored.get(link.getId());
            boolean fresh = row == null;
            if (input.code() != null) {
                if (input.answer() != null) throw SessionAccess.invalid("Chỉ gửi answer hoặc code cho một câu");
                validateCode(snapshot, input.code());
                if (fresh) row = new SessionAnswer(session, link);
                row.saveCode(input.code().language(), input.code().source_code(), now);
            } else {
                AnswerResponse response = input.answer() == null ? null : normalizer.normalize(snapshot, input.answer());
                if (response == null) {
                    if (!fresh) answers.delete(row);
                    stored.remove(link.getId());
                    continue;
                }
                if (fresh) row = new SessionAnswer(session, link);
                row.saveAnswer(response, now);
            }
            // Dòng cũ đã được quản lý (dirty checking); dòng mới persist sau khi đã có giá trị.
            if (fresh) {
                answers.persist(row);
                stored.put(link.getId(), row);
            }
        }
    }

    private void validateCode(QuestionSnapshot snapshot, CodeDraft code) {
        if (snapshot.type() != QuestionType.programming || snapshot.programming() == null)
            throw SessionAccess.invalid("Chỉ câu lập trình nhận mã nguồn");
        List<String> languages = snapshot.programming().allowed_languages();
        if (languages == null || !languages.contains(code.language()))
            throw SessionAccess.invalid("Ngôn ngữ không được phép trong phiên bản đề này");
        if (code.source_code() == null || code.source_code().getBytes(StandardCharsets.UTF_8).length > MAX_SOURCE_BYTES)
            throw SessionAccess.invalid("Mã nguồn tối đa 128KiB");
    }
}
