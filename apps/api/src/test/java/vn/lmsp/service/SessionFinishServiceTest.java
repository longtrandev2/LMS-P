package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.AssessmentFixtures.choose;
import static vn.lmsp.support.SessionFixtures.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.FinishInput;
import vn.lmsp.dto.AttemptSessionDtos.SessionAnswerInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AttemptSession;

class SessionFinishServiceTest {
    private final SessionAccess access = mock(SessionAccess.class);
    private final SessionAnswerService answers = mock(SessionAnswerService.class);
    private final SessionSubmitter submitter = mock(SessionSubmitter.class);
    private final AttemptSessionAssembler assembler = mock(AttemptSessionAssembler.class);
    private final SessionFinishService service = new SessionFinishService(access, answers, submitter, assembler);
    private final Assignment assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
    private AttemptSession session;

    @BeforeEach void setup() { use(UtcTime.now().plusMinutes(5)); }

    private void use(java.time.LocalDateTime endsAt) {
        session = session(assignment, paper(assignment, null), List.of(), endsAt);
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
        when(submitter.submit(900L, SubmitReason.manual, 42L)).thenReturn(session);
    }

    @Test void savesGivenAnswersBeforeSubmitting() {
        var input = List.of(new SessionAnswerInput(100L, choose(100L, 11L), null));
        service.finish(900L, 42L, new FinishInput(input));

        InOrder order = inOrder(answers, submitter, assembler);
        order.verify(answers).apply(eq(session), eq(input), any());
        order.verify(submitter).submit(900L, SubmitReason.manual, 42L);
        order.verify(assembler).summary(eq(session), any());
    }

    @Test void alreadySubmittedReturnsStoredResult() {
        session.markSubmitted(SubmitReason.timeout, UtcTime.now(), null);
        service.finish(900L, 42L, null);
        verifyNoInteractions(answers, submitter);
        verify(assembler).summary(eq(session), any());
    }

    @Test void pastGraceIsRejected() {
        use(UtcTime.now().minusSeconds(10));
        assertThatThrownBy(() -> service.finish(900L, 42L, null)).isInstanceOf(LmsException.class)
                .extracting("code").isEqualTo("SESSION_ENDED");
        verifyNoInteractions(submitter);
    }
}
