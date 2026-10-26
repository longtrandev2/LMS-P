package vn.lmsp.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumer `q.grading` — docs/message-contracts.md §2–3. Không chấm được thì gửi `failed`
 * rồi đưa job vào DLQ; message không parse được thì reject thẳng vào DLQ.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GradingConsumer {
    private static final int MAX_JOB_BYTES = 16 * 1024;
    private final ObjectMapper mapper;
    private final GradingJobReader jobs;
    private final ExecutionService executor;
    private final GradingEventPublisher events;

    @RabbitListener(queues = "q.grading")
    public void consume(Message message, Channel channel) throws Exception {
        long tag = message.getMessageProperties().getDeliveryTag();
        JobMessage job = parse(message.getBody());
        if (job == null) {
            log.warn("Rejecting unparseable grading message");
            channel.basicReject(tag, false);
            return;
        }

        GradingProblem problem;
        try {
            validate(job);
            var loaded = jobs.load(job);
            if (loaded.isEmpty()) {
                channel.basicAck(tag, false);
                return;
            }
            problem = loaded.get();
        } catch (RuntimeException error) {
            log.warn("Cannot read grading job {}: {}", job.job_id(), error.getMessage());
            failAndDeadLetter(job, "Không đọc được job chấm bài.", 0, channel, tag);
            return;
        }

        try { events.progress(job); }
        catch (RuntimeException error) { log.warn("Could not publish progress for job {}", job.job_id(), error); }
        var result = executor.run(problem.request(), "grading job " + job.job_id());
        if (!result.failed()) {
            try {
                events.completed(job, result);
                channel.basicAck(tag, false);
                return;
            } catch (RuntimeException error) {
                log.error("Could not publish result for job {}", job.job_id(), error);
                result = ExecutionResult.failure("Không gửi được kết quả chấm bài.", result.durationMs());
            }
        }
        failAndDeadLetter(job, result.errorMessage(), result.durationMs(), channel, tag);
    }

    private void failAndDeadLetter(JobMessage job, String error, int durationMs, Channel channel, long tag)
            throws java.io.IOException {
        try { events.failed(job, error, durationMs); }
        catch (RuntimeException publishError) {
            log.error("Could not publish failed event for job {}", job.job_id(), publishError);
        }
        channel.basicNack(tag, false, false);
    }

    /** Null nếu không parse được hoặc thiếu định danh để gửi event `failed`. */
    private JobMessage parse(byte[] body) {
        try {
            if (body.length > MAX_JOB_BYTES) return null;
            JobMessage job = mapper.readValue(body, JobMessage.class);
            if (job == null || job.job_id() == null || !job.job_id().matches("[0-9a-fA-F-]{36}")
                    || job.submission_id() == null) return null;
            return job;
        } catch (Exception error) {
            return null;
        }
    }

    private void validate(JobMessage job) {
        if (job.schema_version() != 3 || job.question_id() == null || job.question_version_id() == null
                || !LanguageProfile.supports(job.language()))
            throw new IllegalArgumentException("Invalid grading job contract");
    }
}
