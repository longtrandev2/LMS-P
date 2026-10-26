package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.repository.GradingJobRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradingOutboxDispatcher {
    private final GradingJobRepository jobs;
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;
    private final GradingMapper mapper;

    @Transactional
    public boolean publishNext() {
        var pending = jobs.findPending(UtcTime.now(), PageRequest.of(0, 1));
        if (pending.isEmpty()) return false;
        var job = pending.getFirst();
        if (job.getSubmission().isTerminal()) {
            job.published(UtcTime.now());
            return true;
        }
        try {
            var message = MessageBuilder.withBody(json.writeValueAsBytes(mapper.toJob(job)))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON).setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                    .setMessageId(job.getJobId()).setPriority(job.getPriority()).build();
            var correlation = new CorrelationData(job.getJobId());
            rabbit.send("lms", "grading.submit", message, correlation);
            var confirm = correlation.getFuture().get(5, TimeUnit.SECONDS);
            if (!confirm.isAck() || correlation.getReturned() != null) throw new IllegalStateException("Publish not routed/confirmed");
            job.published(UtcTime.now());
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            job.retryLater(UtcTime.now());
            log.warn("Grading job {} remains in outbox: {}", job.getJobId(), error.getClass().getSimpleName());
        }
        return true;
    }
}
