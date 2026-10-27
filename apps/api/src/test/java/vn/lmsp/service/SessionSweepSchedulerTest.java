package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import vn.lmsp.common.UtcTime;
import vn.lmsp.repository.AttemptSessionRepository;

class SessionSweepSchedulerTest {
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final SessionSubmitService submitter = mock(SessionSubmitService.class);
    private final SessionSweepScheduler scheduler = new SessionSweepScheduler(sessions, submitter);

    @Test void submitsEveryDueSessionPastGraceAndKeepsGoingAfterAFailure() {
        when(sessions.findDueIds(any(), any())).thenReturn(List.of(1L, 2L, 3L));
        when(submitter.submitIfDue(eq(2L), any())).thenThrow(new IllegalStateException("boom"));
        LocalDateTime start = UtcTime.now();

        scheduler.sweep();

        var before = ArgumentCaptor.forClass(LocalDateTime.class);
        var page = ArgumentCaptor.forClass(Pageable.class);
        verify(sessions).findDueIds(before.capture(), page.capture());
        assertThat(before.getValue()).isBetween(start.minusSeconds(6), UtcTime.now().minusSeconds(5));
        assertThat(page.getValue().getPageSize()).isEqualTo(100);
        verify(submitter).submitIfDue(1L, before.getValue());
        verify(submitter).submitIfDue(2L, before.getValue());
        verify(submitter).submitIfDue(3L, before.getValue());
    }

    @Test void repositoryErrorsAreSwallowed() {
        when(sessions.findDueIds(any(), any())).thenThrow(new IllegalStateException("db down"));
        assertThatCode(scheduler::sweep).doesNotThrowAnyException();
        verifyNoInteractions(submitter);
    }
}
