package vn.lmsp.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class GradingConsumer {
    private final ObjectMapper mapper;

    // Enable only after the sandbox worker processes/publishes results instead of merely acknowledging jobs.
    @RabbitListener(queues = "q.grading", autoStartup = "false")
    public void consume(Message message, Channel channel) throws Exception {
        long tag = message.getMessageProperties().getDeliveryTag();
        try {
            JsonNode body = mapper.readTree(message.getBody());
            for (String field : new String[]{"submission_id", "question_id", "student_id", "language", "priority"}) {
                if (!body.has(field)) throw new IllegalArgumentException("missing field: " + field);
            }
            log.info("Received grading submission_id={} question_id={} language={} (grading pipeline pending)",
                    body.get("submission_id").asText(), body.get("question_id").asText(), body.get("language").asText());
            channel.basicAck(tag, false);
        } catch (Exception error) {
            log.error("Rejecting malformed grading message", error);
            channel.basicReject(tag, false);
        }
    }
}
