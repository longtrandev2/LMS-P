package vn.lmsp.worker;

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
    private static final int MAX_JOB_BYTES = 16 * 1024;
    private final ObjectMapper mapper;
    private final GradingJobReader jobs;
    private final ProgramGrader grader;
    private final GradingEventPublisher events;

    @RabbitListener(queues = "q.grading")
    public void consume(Message message, Channel channel) throws Exception {
        long tag = message.getMessageProperties().getDeliveryTag();
        JobMessage job;
        try {
            if (message.getBody().length > MAX_JOB_BYTES) throw new IllegalArgumentException("Job too large");
            job = mapper.readValue(message.getBody(), JobMessage.class);
            validate(job);
        } catch (Exception error) {
            log.warn("Rejecting invalid grading message: {}", error.getClass().getSimpleName());
            channel.basicReject(tag, false);
            return;
        }

        var problem = jobs.load(job);
        if (problem.isEmpty()) {
            channel.basicAck(tag, false);
            return;
        }
        events.progress(job);
        GradeOutcome outcome = gradeWithRetry(problem.get(), job);
        if (outcome == null) {
            events.failed(job, "Worker sandbox failed after bounded retries");
            channel.basicNack(tag, false, false);
            return;
        }
        events.completed(job, outcome);
        channel.basicAck(tag, false);
    }

    private GradeOutcome gradeWithRetry(GradingProblem problem, JobMessage job) throws InterruptedException {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try { return grader.grade(problem); }
            catch (SandboxException error) {
                log.warn("Sandbox attempt {}/3 failed for job {}: {}", attempt, job.job_id(), error.getMessage());
                if (attempt < 3) Thread.sleep(attempt * 500L);
            }
        }
        return null;
    }

    private void validate(JobMessage job) {
        if (job == null || job.schema_version() != 3 || job.job_id() == null
                || job.submission_id() == null || job.question_id() == null
                || job.question_version_id() == null || job.language() == null
                || !java.util.Set.of("python", "c", "cpp", "java").contains(job.language()))
            throw new IllegalArgumentException("Invalid grading job contract");
    }
}
