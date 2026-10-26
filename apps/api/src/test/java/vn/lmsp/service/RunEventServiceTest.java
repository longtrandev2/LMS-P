package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import vn.lmsp.dto.RunDtos.*;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.model.RunJob;
import vn.lmsp.repository.RunJobRepository;
import vn.lmsp.security.GradingWebSocketHandler;

class RunEventServiceTest {
    private final RunJobRepository jobs = mock(RunJobRepository.class);
    private final GradingWebSocketHandler sockets = mock(GradingWebSocketHandler.class);
    private final RunEventService service = new RunEventService(jobs, new RunNotifier(sockets, new ObjectMapper()));
    private final RunJob job = RunJobServiceTest.job(RunJobKind.problem_check, 7L);

    RunEventServiceTest() {
        when(jobs.findLockedByJobId(job.getJobId())).thenReturn(Optional.of(job));
    }

    private RunEvent event(String name, String status, GradingVerdict verdict, List<RunEventTest> tests) {
        return new RunEvent(name, new RunEventPayload(job.getJobId(), status, verdict, null, null, 900, tests));
    }

    @Test void statusThenCompletedStoresResultAndNotifiesRequester() {
        service.apply(event("run.status", "running", null, null));
        assertThat(job.getStatus()).isEqualTo("running");

        service.apply(event("run.completed", "completed", GradingVerdict.WA,
                List.of(new RunEventTest(1, GradingVerdict.AC, 5, "3"), new RunEventTest(2, GradingVerdict.WA, 4, "9"))));

        assertThat(job.getStatus()).isEqualTo("completed");
        assertThat(job.getVerdict()).isEqualTo(GradingVerdict.WA);
        assertThat(job.getResult().tests()).hasSize(2);
        assertThat(job.getResult().duration_ms()).isEqualTo(900);
        assertThat(job.getCompletedAt()).isNotNull();
        verify(sockets).sendToUser(eq("7"), argThat(frame -> frame.contains("\"type\":\"run.completed\"")
                && frame.contains(job.getJobId()) && !frame.contains("print(3)")));
    }

    @Test void eventsForFinishedJobAreIgnored() {
        service.apply(event("run.completed", "failed", GradingVerdict.SYSTEM_ERROR, List.of()));
        service.apply(event("run.completed", "completed", GradingVerdict.AC, List.of()));
        service.apply(event("run.status", "running", null, null));

        assertThat(job.getStatus()).isEqualTo("failed");
        assertThat(job.getVerdict()).isEqualTo(GradingVerdict.SYSTEM_ERROR);
        verify(sockets, times(1)).sendToUser(any(), any());
    }

    @Test void inconsistentEventsAreRejected() {
        assertThatThrownBy(() -> service.apply(event("run.completed", "failed", GradingVerdict.WA, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.apply(event("run.completed", "completed", GradingVerdict.SYSTEM_ERROR, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.apply(event("run.status", "completed", null, null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(job.getStatus()).isEqualTo("pending");
    }

    @Test void listenerRejectsInvalidPayloadWithoutRequeue() {
        var listener = new RunEventListener(new ObjectMapper(), Validation.buildDefaultValidatorFactory().getValidator(), service);
        byte[] invalid = "{\"event\":\"run.status\",\"payload\":{\"run_id\":\"x\",\"status\":\"running\"}}".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> listener.onEvent(invalid)).isInstanceOf(AmqpRejectAndDontRequeueException.class);
        assertThatThrownBy(() -> listener.onEvent(new byte[RunEventListener.MAX_EVENT_BYTES + 1]))
                .isInstanceOf(AmqpRejectAndDontRequeueException.class);
    }
}
