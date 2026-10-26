package vn.lmsp.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/** Publish event JSON persistent, mandatory lên exchange `lms` và đợi publisher confirm. */
@Component
public class ConfirmedPublisher {
    static final String EXCHANGE = "lms";
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;

    public ConfirmedPublisher(RabbitTemplate rabbit, ObjectMapper json) {
        this.rabbit = rabbit;
        this.json = json;
    }

    public void publish(String routingKey, String messageId, Object event) {
        try {
            var message = MessageBuilder.withBody(json.writeValueAsBytes(event))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                    .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                    .setMessageId(messageId).build();
            var correlation = new CorrelationData(messageId);
            rabbit.send(EXCHANGE, routingKey, message, correlation);
            var confirm = correlation.getFuture().get(5, TimeUnit.SECONDS);
            if (!confirm.isAck() || correlation.getReturned() != null)
                throw new IllegalStateException("Event was not routed and confirmed");
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("Could not publish " + routingKey + " event", error);
        }
    }
}
