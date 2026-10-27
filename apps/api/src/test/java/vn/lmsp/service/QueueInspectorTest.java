package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.QueueInformation;
import vn.lmsp.dto.AdminDtos.QueueStat;

class QueueInspectorTest {
    private final AmqpAdmin admin = mock(AmqpAdmin.class);
    private final QueueInspector inspector = new QueueInspector(admin);

    @Test void snapshotListsEveryQueueInOrderAndMissingQueuesAsZero() {
        when(admin.getQueueInfo(anyString())).thenReturn(null);
        when(admin.getQueueInfo("q.grading")).thenReturn(new QueueInformation("q.grading", 12, 2));
        when(admin.getQueueInfo("q.grading.dead")).thenReturn(new QueueInformation("q.grading.dead", 3, 0));

        var stats = inspector.snapshot().orElseThrow();

        assertThat(stats).extracting(QueueStat::name).containsExactly("q.grading", "q.grading.dead", "q.grading.events",
                "q.grading.events.dead", "q.runs", "q.runs.dead", "q.run.events", "q.run.events.dead");
        assertThat(stats.get(0)).isEqualTo(new QueueStat("q.grading", 12, 2));
        assertThat(stats.get(1)).isEqualTo(new QueueStat("q.grading.dead", 3, 0));
        assertThat(stats.get(4)).isEqualTo(new QueueStat("q.runs", 0, 0));
        assertThat(inspector.consumers("q.grading")).isEqualTo(2);
    }

    @Test void brokerDownGivesEmptySnapshotAndZeroWorkers() {
        when(admin.getQueueInfo(anyString())).thenThrow(new AmqpConnectException(new java.net.ConnectException("refused")));
        assertThat(inspector.snapshot()).isEmpty();
        assertThat(inspector.consumers("q.grading")).isZero();
    }

    @Test void onlyKnownDeadQueuesArePurgeable() {
        assertThat(QueueInspector.isDeadQueue("q.grading.dead")).isTrue();
        assertThat(QueueInspector.isDeadQueue("q.run.events.dead")).isTrue();
        assertThat(QueueInspector.isDeadQueue("q.grading")).isFalse();
        assertThat(QueueInspector.isDeadQueue("other.dead")).isFalse();
        assertThat(QueueInspector.isDeadQueue(null)).isFalse();
    }
}
