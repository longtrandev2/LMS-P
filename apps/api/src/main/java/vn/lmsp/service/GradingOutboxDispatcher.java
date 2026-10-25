package vn.lmsp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.repository.GradingJobRepository;

@Service
public class GradingOutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(GradingOutboxDispatcher.class);
    private final GradingJobRepository jobs;
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;
    private final GradingMapper mapper;

    public GradingOutboxDispatcher(GradingJobRepository jobs, RabbitTemplate rabbit, ObjectMapper json, GradingMapper mapper) {
        this.jobs = jobs; this.rabbit = rabbit; this.json = json; this.mapper = mapper;
    }

    @Transactional
    public boolean publishNext() {
        var pending = jobs.findPending(LocalDateTime.now(), PageRequest.of(0, 1));
        if (pending.isEmpty()) return false;
        var job = pending.getFirst();
        if (job.getSubmission().isTerminal()) {
            job.published(LocalDateTime.now());
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
            job.published(LocalDateTime.now());
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            job.retryLater(LocalDateTime.now());
            log.warn("Grading job {} remains in outbox: {}", job.getJobId(), error.getClass().getSimpleName());
        }
        return true;
    }
}
