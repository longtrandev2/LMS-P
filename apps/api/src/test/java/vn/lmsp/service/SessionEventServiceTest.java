package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.SessionFixtures.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.SessionEventInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.SessionEventRepository;

class SessionEventServiceTest {
    private final SessionAccess access = mock(SessionAccess.class);
    private final SessionEventRepository events = mock(SessionEventRepository.class);
    private final AttemptSessionAssembler assembler = new AttemptSessionAssembler(null, null, null, null, null);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC);
    private final SessionEventService service = new SessionEventService(access, events, new SessionEventRateLimiter(clock), assembler);
    private AttemptSession session;

    @BeforeEach void setup() {
        var assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
        session = session(assignment, paper(assignment, null), List.of(), UtcTime.now().plusMinutes(20));
        when(access.ownSession(900L, 42L, true)).thenReturn(session);
    }

    @Test void heartbeatOnlyTouchesLastSeen() {
        var before = session.getLastSeenAt();
        var clock = service.client(900L, 42L, new SessionEventInput(SessionEventType.heartbeat, null));

        assertThat(session.getLastSeenAt()).isAfter(before);
        assertThat(clock.focus_lost_count()).isZero();
        assertThat(clock.saved_at()).isNull();
        verifyNoInteractions(events);
    }

    @Test void focusLostIsStoredAndCounted() {
        service.client(900L, 42L, new SessionEventInput(SessionEventType.focus_lost, null));
        var clock = service.client(900L, 42L, new SessionEventInput(SessionEventType.focus_lost,
                Map.of("occurred_at", "2026-10-27T00:00:00Z", "nested", Map.of("x", 1))));

        assertThat(clock.focus_lost_count()).isEqualTo(2);
        verify(events, times(2)).save(argThat(event -> event.getType() == SessionEventType.focus_lost));
        verify(events).save(argThat(event -> event.getDetail() != null && event.getDetail().equals(Map.of("occurred_at", "2026-10-27T00:00:00Z"))));
    }

    @Test void serverTypesAreRejectedAndEndedSessionsConflict() {
        assertCode(() -> service.client(900L, 42L, new SessionEventInput(SessionEventType.submitted, null)), "VALIDATION_ERROR");
        session.markSubmitted(SubmitReason.manual, UtcTime.now(), null);
        assertCode(() -> service.client(900L, 42L, new SessionEventInput(SessionEventType.heartbeat, null)), "SESSION_ENDED");
    }

    @Test void sixtyEventsPerMinutePerSession() {
        for (int i = 0; i < 60; i++) service.client(900L, 42L, new SessionEventInput(SessionEventType.heartbeat, null));
        assertThatThrownBy(() -> service.client(900L, 42L, new SessionEventInput(SessionEventType.heartbeat, null)))
                .isInstanceOf(LmsException.class)
                .satisfies(error -> {
                    assertThat(((LmsException) error).getCode()).isEqualTo("RATE_LIMITED");
                    assertThat(((LmsException) error).getStatus().value()).isEqualTo(429);
                });
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
        assertThatThrownBy(call).isInstanceOf(LmsException.class).extracting("code").isEqualTo(code);
    }
}
