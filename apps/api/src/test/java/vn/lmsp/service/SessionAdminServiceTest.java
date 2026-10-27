package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.ExtendInput;
import vn.lmsp.dto.AttemptSessionDtos.ForceSubmitInput;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.SessionEventRepository;

class SessionAdminServiceTest {
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final SessionEventRepository events = mock(SessionEventRepository.class);
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final SessionSubmitter submitter = mock(SessionSubmitter.class);
    private final AuditService audit = mock(AuditService.class);
    private final QuizAttemptService quizzes = mock(QuizAttemptService.class);
    private final Assignment exam = assignment(AssignmentCategory.FINAL);
    private final User student = user(42, "student");
    private final AssessmentPaper paper = identified(new AssessmentPaper(exam, "102", null, BigDecimal.TEN), 9);
    private AttemptSession session;
    private SessionAdminService service;

    @BeforeEach void setup() {
        service = new SessionAdminService(sessions, events, access, submitter, audit, new SessionAdminSummaryAssembler(quizzes));
        var now = UtcTime.now();
        session = identified(new AttemptSession(exam, student, 1, paper, List.of(1L), now.minusMinutes(50),
                now.plusMinutes(10), null), 5);
        when(sessions.findForUpdate(5L)).thenReturn(Optional.of(session));
        when(sessions.findById(5L)).thenReturn(Optional.of(session));
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(exam);
    }

    @Test void extendAddsMinutesLogsEventAndAuditsBeforeAfter() {
        var before = session.getEndsAt();

        var summary = service.extend(5L, new ExtendInput(15, " Mất điện "), 7L, false);

        assertThat(session.getEndsAt()).isEqualTo(before.plusMinutes(15));
        assertThat(session.getExtraMinutes()).isEqualTo(15);
        assertThat(summary.ends_at()).isEqualTo(before.plusMinutes(15));
        assertThat(summary.paper_code()).isEqualTo("102");
        assertThat(summary.attempt()).isNull();
        var event = ArgumentCaptor.forClass(SessionEvent.class);
        verify(events).save(event.capture());
        assertThat(event.getValue().getType()).isEqualTo(SessionEventType.extended);
        assertThat(event.getValue().getDetail()).containsEntry("minutes", 15).containsEntry("reason", "Mất điện").containsEntry("by", 7L);
        verify(audit).record(7L, "session.extend", "attempt_session", 5L, Map.of("ends_at", before.toString()),
                Map.of("ends_at", before.plusMinutes(15).toString(), "minutes", 15, "reason", "Mất điện"));
    }

    @Test void submittedSessionsCannotBeExtendedOrForceSubmitted() {
        session.markSubmitted(SubmitReason.manual, UtcTime.now(), null);
        assertThatThrownBy(() -> service.extend(5L, new ExtendInput(5, "x"), 7L, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        assertThatThrownBy(() -> service.forceSubmit(5L, new ForceSubmitInput("x"), 7L, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        verifyNoInteractions(submitter, events, audit);
    }

    @Test void otherLecturersAreRejectedByAccessCheck() {
        when(access.lecturerAssignment(50L, 8L, false, false)).thenThrow(
                new LmsException("FORBIDDEN", "x", org.springframework.http.HttpStatus.FORBIDDEN, null));
        assertThatThrownBy(() -> service.extend(5L, new ExtendInput(5, "x"), 8L, false)).isInstanceOf(LmsException.class);
        assertThatThrownBy(() -> service.events(5L, 8L, false)).isInstanceOf(LmsException.class);
        assertThat(session.getExtraMinutes()).isZero();
    }

    @Test void forceSubmitDelegatesToSubmitterAndAuditsReason() {
        var attempt = identified(new AssignmentAttempt(exam, student, 1, false, 0, BigDecimal.ONE, "k", UtcTime.now()), 70);
        when(submitter.submit(5L, SubmitReason.forced, 7L)).thenAnswer(call -> {
            session.markSubmitted(SubmitReason.forced, UtcTime.now(), attempt);
            return session;
        });
        var view = new QuizAttemptView(70L, 1, BigDecimal.ONE, BigDecimal.TEN, false, 0, UtcTime.now(), true, null, List.of());
        when(quizzes.attemptView(attempt, exam, true)).thenReturn(view);

        var summary = service.forceSubmit(5L, new ForceSubmitInput(" Gian lận "), 7L, false);

        assertThat(summary.status()).isEqualTo(AttemptSessionStatus.submitted);
        assertThat(summary.submit_reason()).isEqualTo(SubmitReason.forced);
        assertThat(summary.remaining_seconds()).isZero();
        assertThat(summary.attempt()).isSameAs(view);
        verify(audit).record(7L, "session.force_submit", "attempt_session", 5L, null, Map.of("reason", "Gian lận"));
    }

    @Test void forceSubmitLosingTheRaceToAnotherSubmitIsAConflict() {
        when(submitter.submit(5L, SubmitReason.forced, 7L)).thenAnswer(call -> {
            session.markSubmitted(SubmitReason.timeout, UtcTime.now(), null);
            return session;
        });
        assertThatThrownBy(() -> service.forceSubmit(5L, new ForceSubmitInput("x"), 7L, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        verify(audit, never()).record(any(), eq("session.force_submit"), any(), any(), any(), any());
    }

    @Test void eventsAreListedInTimeOrder() {
        var now = UtcTime.now();
        when(events.findAllBySession_IdOrderByOccurredAtAscIdAsc(5L)).thenReturn(List.of(
                new SessionEvent(session, SessionEventType.started, now.minusMinutes(5), null),
                new SessionEvent(session, SessionEventType.focus_lost, now, Map.of("n", 1))));

        var views = service.events(5L, 7L, false);

        assertThat(views).extracting(view -> view.type()).containsExactly(SessionEventType.started, SessionEventType.focus_lost);
        assertThat(views.get(1).detail()).containsEntry("n", 1);
    }
}
