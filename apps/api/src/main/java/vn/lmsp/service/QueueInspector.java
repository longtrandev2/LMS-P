package vn.lmsp.service;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.QueueInformation;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AdminDtos.QueueStat;

/**
 * Độ sâu và số consumer các hàng RabbitMQ (config/RabbitTopology) bằng khai báo passive qua AMQP —
 * không cần plugin management (docs/admin-spec.md §3).
 */
@Component
@RequiredArgsConstructor
public class QueueInspector {
    public static final String GRADING = "q.grading";
    public static final List<String> QUEUES = List.of(GRADING, "q.grading.dead", "q.grading.events",
            "q.grading.events.dead", "q.runs", "q.runs.dead", "q.run.events", "q.run.events.dead");
    private final AmqpAdmin admin;

    /** Rỗng khi broker không phản hồi. Hàng chưa được khai báo trả 0/0. */
    public Optional<List<QueueStat>> snapshot() {
        try {
            return Optional.of(QUEUES.stream().map(this::stat).toList());
        } catch (AmqpException unavailable) {
            return Optional.empty();
        }
    }

    /** Số consumer của một hàng; 0 khi broker không phản hồi. */
    public long consumers(String name) {
        try {
            return stat(name).consumers();
        } catch (AmqpException unavailable) {
            return 0;
        }
    }

    /** Chỉ các hàng chết đã biết mới được dọn (admin-spec §4). */
    public static boolean isDeadQueue(String name) {
        return name != null && name.endsWith(".dead") && QUEUES.contains(name);
    }

    /** @throws AmqpException khi broker không phản hồi. */
    public long purge(String name) {
        return admin.purgeQueue(name);
    }

    private QueueStat stat(String name) {
        QueueInformation info = admin.getQueueInfo(name);
        return info == null ? new QueueStat(name, 0, 0) : new QueueStat(name, info.getMessageCount(), info.getConsumerCount());
    }
}
