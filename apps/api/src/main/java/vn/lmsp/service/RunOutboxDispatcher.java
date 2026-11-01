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
import vn.lmsp.mapper.RunJobMapper;
import vn.lmsp.repository.RunJobRepository;

/** Outbox `run_jobs` → exchange `lms` / `run.submit` (message-contracts.md §4), đánh dấu sau khi broker confirm. */
@Service
@RequiredArgsConstructor
@Slf4j
public class RunOutboxDispatcher {
    private final RunJobRepository jobs;
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;
    private final RunJobMapper mapper;

    @Transactional
    public boolean publishNext() {
        var pending = jobs.findPending(UtcTime.now(), PageRequest.of(0, 1));
        if (pending.isEmpty()) return false;
        var job = pending.getFirst();
        if (job.isTerminal()) {
            job.published(UtcTime.now());
            return true;
        }
        try {
            var message = MessageBuilder.withBody(json.writeValueAsBytes(mapper.toMessage(job)))
                    .setContentType(MessageProperties.CONTENT_TYPE_JSON).setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                    .setMessageId(job.getJobId()).build();
            var correlation = new CorrelationData(job.getJobId());
            rabbit.send("lms", "run.submit", message, correlation);
            var confirm = correlation.getFuture().get(5, TimeUnit.SECONDS);
            if (!confirm.isAck() || correlation.getReturned() != null) throw new IllegalStateException("Publish not routed/confirmed");
            job.published(UtcTime.now());
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            job.retryLater(UtcTime.now());
            log.warn("Run job {} remains in outbox: {}", job.getJobId(), error.getClass().getSimpleName());
        }
        return true;
    }
}
