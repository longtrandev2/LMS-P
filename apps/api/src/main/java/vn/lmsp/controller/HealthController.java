package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.QueueHealth;
import vn.lmsp.service.QueueInspector;
import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {
    private final DataSource dataSource;
    private final ConnectionFactory rabbit;
    private final QueueInspector queues;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean db = canConnectToDatabase();
        boolean amqp = canConnectToRabbit();
        Map<String, Object> body = Map.of("status", db && amqp ? "ok" : "degraded", "db", db, "amqp", amqp);
        return ResponseEntity.status(db && amqp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /** Độ sâu + consumer từng hàng (admin-spec.md §3); `/api/v1/...` để đi qua proxy `/api` của nginx. */
    @GetMapping({"/health/queue", "/api/v1/health/queue"})
    public ResponseEntity<QueueHealth> queue() {
        var checkedAt = UtcTime.now();
        return queues.snapshot().map(stats -> ResponseEntity.ok(new QueueHealth(stats, checkedAt)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new QueueHealth(List.of(), checkedAt)));
    }

    private boolean canConnectToDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean canConnectToRabbit() {
        try (var connection = rabbit.createConnection()) {
            return connection.isOpen();
        } catch (Exception ignored) {
            return false;
        }
    }
}
