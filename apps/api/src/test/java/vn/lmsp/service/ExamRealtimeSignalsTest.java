package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.SessionFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.SessionEventInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.SessionEventRepository;
import vn.lmsp.security.GradingWebSocketHandler;

class ExamRealtimeSignalsTest {
    private final RealtimePublisher realtime = mock(RealtimePublisher.class);
    private final Clock clock = mock(Clock.class);
    private final ExamRealtimeSignals signals = new ExamRealtimeSignals(realtime, clock);
    private AttemptSession session;

    @BeforeEach void setup() {
        var assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
        session = session(assignment, paper(assignment, null), List.of(), UtcTime.now().plusMinutes(20));
        when(clock.millis()).thenReturn(1_000_000L);
    }

    @Test void startedGoesToClassLecturerAndAdminsWithIds() {
        signals.onEvent(session, SessionEventType.started);

        verify(realtime).toUsersAndAdmins(List.of(7L), "exam.session_changed",
                Map.of("assignment_id", 50L, "session_id", 900L, "student_id", 42L, "change", "started"));
        verifyNoMoreInteractions(realtime);
    }

    @Test void heartbeatIsNotSignalled() {
        signals.onEvent(session, SessionEventType.heartbeat);
        verifyNoInteractions(realtime);
    }

    @Test void savedAndFocusAreThrottledToOnePerFiveSecondsPerSession() {
        signals.saved(session);
        signals.saved(session);
        signals.onEvent(session, SessionEventType.focus_lost);
        signals.onEvent(session, SessionEventType.online);
        verify(realtime, times(1)).toUsersAndAdmins(any(), any(), argThat(data -> "saved".equals(data.get("change"))));
        verify(realtime, times(1)).toUsersAndAdmins(any(), any(), argThat(data -> "focus".equals(data.get("change"))));

        when(clock.millis()).thenReturn(1_005_000L);
        signals.saved(session);
        verify(realtime, times(2)).toUsersAndAdmins(any(), any(), argThat(data -> "saved".equals(data.get("change"))));
    }

    @Test void startedResumedAndSubmittedAreNeverThrottled() {
        signals.onEvent(session, SessionEventType.resumed);
        signals.onEvent(session, SessionEventType.resumed);
        verify(realtime, times(2)).toUsersAndAdmins(any(), any(), argThat(data -> "resumed".equals(data.get("change"))));
    }

    @Test void forcedSubmitAndExtendAlsoTellTheOwnerTheNewTiming() {
        signals.onEvent(session, SessionEventType.extended);
        verify(realtime).toUser(eq(42L), eq("session.timing_changed"), argThat(data -> data.get("session_id").equals(900L)
                && data.get("status") == AttemptSessionStatus.in_progress && data.get("ends_at").equals(session.getEndsAt())));

        session.markSubmitted(SubmitReason.forced, UtcTime.now(), null);
        signals.onEvent(session, SessionEventType.forced_submitted);
        verify(realtime).toUsersAndAdmins(any(), any(), argThat(data -> "submitted".equals(data.get("change"))));
        verify(realtime).toUser(eq(42L), eq("session.timing_changed"),
                argThat(data -> data.get("status") == AttemptSessionStatus.submitted));
    }

    @Test void manualSubmitDoesNotSendTimingToTheOwner() {
        signals.onEvent(session, SessionEventType.submitted);
        verify(realtime, never()).toUser(any(), any(), any());
    }

    @Test void publisherFailureIsSwallowed() {
        doThrow(new IllegalStateException("boom")).when(realtime).toUsersAndAdmins(any(), any(), any());
        assertThatCode(() -> signals.onEvent(session, SessionEventType.started)).doesNotThrowAnyException();
        assertThatCode(() -> signals.saved(session)).doesNotThrowAnyException();
    }

    @Test void focusEventSucceedsEvenWhenTheSocketThrows() {
        var sockets = mock(GradingWebSocketHandler.class);
        doThrow(new IllegalStateException("socket down")).when(sockets).sendToUsersAndAdmins(any(), any());
        var access = mock(SessionAccess.class);
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
        var events = mock(SessionEventRepository.class);
        var service = new SessionEventService(access, events,
                new SessionEventRateLimiter(Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC)),
                new AttemptSessionAssembler(null, null, null, null, null),
                new ExamRealtimeSignals(new RealtimePublisher(sockets, new ObjectMapper()), clock));

        var result = service.client(900L, 42L, new SessionEventInput(SessionEventType.focus_lost, null));

        assertThat(result.focus_lost_count()).isEqualTo(1);
        verify(events).save(any());
        verify(sockets).sendToUsersAndAdmins(eq(List.of("7")), contains("\"change\":\"focus\""));
    }
}
