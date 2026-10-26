package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.GradingDtos.WorkerEvent;

@Component
@RequiredArgsConstructor
public class GradingEventListener {
    private final ObjectMapper json;
    private final Validator validator;
    private final GradingEventService events;

    @RabbitListener(queues = "q.grading.events")
    public void onEvent(byte[] body) {
        try {
            if (body.length > 16 * 1024 * 1024) throw new IllegalArgumentException("Worker event too large");
            WorkerEvent event = json.readValue(body, WorkerEvent.class);
            if (event == null || !validator.validate(event).isEmpty()) throw new IllegalArgumentException("Invalid worker event");
            events.apply(event);
        } catch (java.io.IOException | IllegalArgumentException error) {
            throw new AmqpRejectAndDontRequeueException("Invalid grading event", error);
        }
    }
}
