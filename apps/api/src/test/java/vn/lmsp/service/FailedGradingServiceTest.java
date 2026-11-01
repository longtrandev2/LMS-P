package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpConnectException;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.repository.FailedGradingQueries;

class FailedGradingServiceTest {
    private final FailedGradingQueries queries = mock(FailedGradingQueries.class);
    private final RegradeService regrade = mock(RegradeService.class);
    private final QueueInspector queues = mock(QueueInspector.class);
    private final AuditService audit = mock(AuditService.class);
    private final FailedGradingService service = new FailedGradingService(queries, regrade, queues, audit);

    @Test void idsAreDeduplicatedAndPassedToRegrade() {
        when(regrade.regradeFailed(any(), any(), any())).thenReturn(new BulkRegradeResult(2, 1));
        var result = service.regrade(new BulkRegradeInput(List.of(5L, 6L, 5L, 7L), null, " Lỗi worker "), 1L);
        assertThat(result).isEqualTo(new BulkRegradeResult(2, 1));
        verify(regrade).regradeFailed(List.of(5L, 6L, 7L), 1L, " Lỗi worker ");
        verifyNoInteractions(queries);
    }

    @Test void allFailedUsesUpToFiveHundredOldestFailedSubmissions() {
        when(queries.failedIds(500)).thenReturn(List.of(1L, 2L));
        service.regrade(new BulkRegradeInput(null, true, "Broker sập"), 1L);
        verify(regrade).regradeFailed(List.of(1L, 2L), 1L, "Broker sập");
    }

    @Test void exactlyOneOfIdsOrAllFailedIsRequired() {
        assertInvalid(new BulkRegradeInput(List.of(1L), true, "x"));
        assertInvalid(new BulkRegradeInput(null, null, "x"));
        assertInvalid(new BulkRegradeInput(List.of(), false, "x"));
        verifyNoInteractions(regrade);
    }

    @Test void moreThanFiveHundredIdsAreRejected() {
        List<Long> ids = new ArrayList<>();
        for (long i = 1; i <= 501; i++) ids.add(i);
        assertInvalid(new BulkRegradeInput(ids, null, "x"));
        verifyNoInteractions(regrade);
    }

    @Test void purgeOnlyDeadQueuesAndAudits() {
        when(queues.purge("q.grading.dead")).thenReturn(4L);
        assertThat(service.purge("q.grading.dead", " Dọn ", 1L)).isEqualTo(new PurgeResult(4));
        verify(audit).record(1L, "queue.purge", "queue", 0L, null,
                Map.of("queue", "q.grading.dead", "purged", 4L, "reason", "Dọn"));

        for (String name : Arrays.asList("q.grading", "q.runs", "khac.dead", null))
            assertThatThrownBy(() -> service.purge(name, "x", 1L)).isInstanceOfSatisfying(LmsException.class,
                    error -> assertThat(error.getStatus().value()).isEqualTo(400));
        verify(queues, times(1)).purge(any());
    }

    @Test void purgeWithBrokerDownIsServiceUnavailableWithoutAudit() {
        when(queues.purge(any())).thenThrow(new AmqpConnectException(new java.net.ConnectException("refused")));
        assertThatThrownBy(() -> service.purge("q.runs.dead", "x", 1L)).isInstanceOfSatisfying(LmsException.class,
                error -> assertThat(error.getStatus().value()).isEqualTo(503));
        verifyNoInteractions(audit);
    }

    @Test void failedPageValidatesPagingAndUsesOffset() {
        when(queries.count()).thenReturn(41L);
        var page = service.failed(3, 20);
        verify(queries).page(20, 40);
        assertThat(page.total()).isEqualTo(41);
        assertThatThrownBy(() -> service.failed(0, 20)).isInstanceOf(LmsException.class);
        assertThatThrownBy(() -> service.failed(1, 101)).isInstanceOf(LmsException.class);
    }

    private void assertInvalid(BulkRegradeInput input) {
        assertThatThrownBy(() -> service.regrade(input, 1L)).isInstanceOfSatisfying(LmsException.class,
                error -> assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR"));
    }
}
