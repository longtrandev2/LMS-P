package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.AssessmentFixtures.choose;
import static vn.lmsp.support.SessionFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.*;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.QuestionVersionRepository;
import vn.lmsp.repository.SessionAnswerRepository;

class SessionAnswerServiceTest {
    private final SessionAccess access = mock(SessionAccess.class);
    private final SessionPaper paper = mock(SessionPaper.class);
    private final SessionAnswerRepository answers = mock(SessionAnswerRepository.class);
    private final List<SessionAnswer> stored = new ArrayList<>();
    private final Assignment assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
    private final AssignmentQuestion choice = mcq(assignment, 100);
    private final AssignmentQuestion program = code(assignment, 101);
    private AttemptSession session;
    private SessionAnswerService service;

    @BeforeEach void setup() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        var assembler = new AttemptSessionAssembler(paper, answers, snapshots, new QuestionPaperMapper(), mock(QuizAttemptService.class));
        service = new SessionAnswerService(access, paper, answers, snapshots, new AnswerNormalizer(), assembler);
        session = session(assignment, paper(assignment, null), List.of(choice, program), UtcTime.now().plusMinutes(30));
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
        when(paper.questions(session)).thenReturn(List.of(choice, program));
        when(answers.findAllBySession_Id(900L)).thenReturn(stored);
    }

    private SaveAnswersInput body(SessionAnswerInput... items) { return new SaveAnswersInput(List.of(items)); }

    @Test void savesNormalizedObjectiveAnswerAndCodeAndReturnsClock() {
        var clock = service.save(900L, 42L, body(new SessionAnswerInput(100L, choose(100L, 11L), null),
                new SessionAnswerInput(101L, null, new CodeDraft("python", "print(1)"))));

        var captor = ArgumentCaptor.forClass(SessionAnswer.class);
        verify(answers, times(2)).persist(captor.capture());
        assertThat(captor.getAllValues().get(0).getResponse().selected_option_ids()).containsExactly(11L);
        assertThat(captor.getAllValues().get(1).getSourceCode()).isEqualTo("print(1)");
        assertThat(clock.saved_at()).isNotNull();
        assertThat(clock.remaining_seconds()).isBetween(1700L, 1800L);
        assertThat(session.getLastSeenAt().truncatedTo(java.time.temporal.ChronoUnit.MILLIS)).isEqualTo(clock.server_now());
    }

    @Test void emptyCodeIsAllowedAndMissingAnswerDeletesStoredRow() {
        var row = new SessionAnswer(session, choice);
        row.saveAnswer(null, UtcTime.now());
        stored.add(row);

        service.save(900L, 42L, body(new SessionAnswerInput(100L, null, null),
                new SessionAnswerInput(101L, null, new CodeDraft("python", ""))));

        verify(answers).delete(row);
        verify(answers).persist(argThat(saved -> saved.getAssignmentQuestionId().equals(501L)));
    }

    @Test void existingRowIsUpdatedInPlace() {
        var row = new SessionAnswer(session, program);
        row.saveCode("python", "old", UtcTime.now().minusMinutes(1));
        stored.add(row);

        service.save(900L, 42L, body(new SessionAnswerInput(101L, null, new CodeDraft("python", "new"))));

        assertThat(row.getSourceCode()).isEqualTo("new");
        verify(answers, never()).persist(any());
    }

    @Test void rejectsForeignQuestionWrongLanguageOversizedCodeAndCodeOnObjective() {
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(999L, choose(999L, 11L), null))), "VALIDATION_ERROR");
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(101L, null, new CodeDraft("java", "x")))), "VALIDATION_ERROR");
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(101L, null,
                new CodeDraft("python", "ệ".repeat(50_000))))), "VALIDATION_ERROR");
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(100L, null, new CodeDraft("python", "x")))), "VALIDATION_ERROR");
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(100L, choose(100L, 99L), null))), "VALIDATION_ERROR");
        verify(answers, never()).persist(any());
    }

    @Test void rejectsDuplicatesAndTooManyItems() {
        var item = new SessionAnswerInput(100L, choose(100L, 11L), null);
        assertCode(() -> service.save(900L, 42L, body(item, item)), "VALIDATION_ERROR");
        List<SessionAnswerInput> many = new ArrayList<>();
        for (int i = 0; i < 51; i++) many.add(new SessionAnswerInput(100L + i, (AnswerInput) null, null));
        assertCode(() -> service.save(900L, 42L, new SaveAnswersInput(many)), "VALIDATION_ERROR");
    }

    @Test void endedOrSubmittedSessionRejectsWrites() {
        session = session(assignment, paper(assignment, null), List.of(choice), UtcTime.now().minusSeconds(6));
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
        assertCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(100L, choose(100L, 11L), null))), "SESSION_ENDED");

        session = session(assignment, paper(assignment, null), List.of(choice), UtcTime.now().minusSeconds(3));
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
        when(paper.questions(session)).thenReturn(List.of(choice));
        assertThatCode(() -> service.save(900L, 42L, body(new SessionAnswerInput(100L, choose(100L, 11L), null))))
                .doesNotThrowAnyException();
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
        assertThatThrownBy(call).isInstanceOf(LmsException.class).extracting("code").isEqualTo(code);
    }
}
