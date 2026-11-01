package vn.lmsp.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumer `q.runs` (kiểm tra đề / chạy thử) — docs/message-contracts.md §4–5, assessment-spec.md §7.
 * Dùng chung bộ máy thực thi với bài nộp; lỗi hạ tầng gửi `failed`/`SYSTEM_ERROR` rồi đưa job vào DLQ.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RunConsumer {
    private static final int MAX_JOB_BYTES = 16 * 1024;
    private final ObjectMapper mapper;
    private final RunJobReader jobs;
    private final ExecutionService executor;
    private final RunEventPublisher events;

    @RabbitListener(queues = "q.runs")
    public void consume(Message message, Channel channel) throws Exception {
        long tag = message.getMessageProperties().getDeliveryTag();
        RunJobMessage job = parse(message.getBody());
        if (job == null) {
            log.warn("Rejecting unparseable run message");
            channel.basicReject(tag, false);
            return;
        }

        ExecutionRequest request;
        try {
            if (job.schema_version() != 1 || job.kind() == null) throw new IllegalArgumentException("Invalid run job contract");
            var loaded = jobs.load(job.run_id());
            if (loaded.isEmpty()) {
                channel.basicAck(tag, false);
                return;
            }
            request = loaded.get();
        } catch (RuntimeException error) {
            log.warn("Cannot read run job {}: {}", job.run_id(), error.getMessage());
            failAndDeadLetter(job.run_id(), "Không đọc được job chạy thử.", 0, channel, tag);
            return;
        }

        try { events.running(job.run_id()); }
        catch (RuntimeException error) { log.warn("Could not publish status for run {}", job.run_id(), error); }
        var result = executor.run(request, "run job " + job.run_id());
        if (!result.failed()) {
            try {
                events.completed(job.run_id(), result);
                channel.basicAck(tag, false);
                return;
            } catch (RuntimeException error) {
                log.error("Could not publish result for run {}", job.run_id(), error);
                result = ExecutionResult.failure("Không gửi được kết quả chạy thử.", result.durationMs());
            }
        }
        failAndDeadLetter(job.run_id(), result.errorMessage(), result.durationMs(), channel, tag);
    }

    private void failAndDeadLetter(String runId, String error, int durationMs, Channel channel, long tag)
            throws java.io.IOException {
        try { events.failed(runId, error, durationMs); }
        catch (RuntimeException publishError) { log.error("Could not publish failed event for run {}", runId, publishError); }
        channel.basicNack(tag, false, false);
    }

    private RunJobMessage parse(byte[] body) {
        try {
            if (body.length > MAX_JOB_BYTES) return null;
            RunJobMessage job = mapper.readValue(body, RunJobMessage.class);
            if (job == null || job.run_id() == null || !job.run_id().matches("[0-9a-fA-F-]{36}")) return null;
            return job;
        } catch (Exception error) {
            return null;
        }
    }
}
