package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.RunDtos.RunEvent;

/** Consumer `q.run.events`; event không hợp lệ bị từ chối không requeue → `q.run.events.dead`. */
@Component
@RequiredArgsConstructor
public class RunEventListener {
    static final int MAX_EVENT_BYTES = 8 * 1024 * 1024;
    private final ObjectMapper json;
    private final Validator validator;
    private final RunEventService events;

    @RabbitListener(queues = "q.run.events")
    public void onEvent(byte[] body) {
        try {
            if (body.length > MAX_EVENT_BYTES) throw new IllegalArgumentException("Run event too large");
            RunEvent event = json.readValue(body, RunEvent.class);
            if (event == null || !validator.validate(event).isEmpty()) throw new IllegalArgumentException("Invalid run event");
            events.apply(event);
        } catch (java.io.IOException | IllegalArgumentException error) {
            throw new AmqpRejectAndDontRequeueException("Invalid run event", error);
        }
    }
}
