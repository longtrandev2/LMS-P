package vn.lmsp.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class GradingEventPublisher {
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;

    public GradingEventPublisher(RabbitTemplate rabbit, ObjectMapper json) {
        this.rabbit = rabbit;
        this.json = json;
    }

    public void progress(JobMessage job) {
        publish("status-" + job.job_id(), new Event("submission.status",
                new Payload(job.job_id(), job.submission_id(), "grading", null, false, null, null, null)));
    }

    public void completed(JobMessage job, GradeOutcome outcome) {
        publish("graded-" + job.job_id(), new Event("submission.graded",
                new Payload(job.job_id(), job.submission_id(), "completed", outcome.verdict().name(),
                        outcome.compileError(), outcome.compileOutput(), outcome.errorMessage(), outcome.durationMs())));
    }

    public void failed(JobMessage job, String error) {
        publish("failed-" + job.job_id(), new Event("submission.graded",
                new Payload(job.job_id(), job.submission_id(), "failed", "SYSTEM_ERROR", false,
                        null, error, 0)));
    }

    private void publish(String correlationId, Event event) {
        try {
            var message = MessageBuilder.withBody(json.writeValueAsBytes(event))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                    .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                    .setMessageId(correlationId).build();
            var correlation = new CorrelationData(correlationId);
            rabbit.send("lms", "grading.events", message, correlation);
            var confirm = correlation.getFuture().get(5, TimeUnit.SECONDS);
            if (!confirm.isAck() || correlation.getReturned() != null)
                throw new IllegalStateException("Grading event was not routed and confirmed");
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("Could not publish grading event", error);
        }
    }

    private record Event(String event, Payload payload) { }
    private record Payload(String job_id, Long submission_id, String status, String verdict,
            boolean compile_error, String compile_output, String error_message, Integer duration_ms) { }
}
