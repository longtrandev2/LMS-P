package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {
    private final DataSource dataSource;
    private final ConnectionFactory rabbit;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean db = canConnectToDatabase();
        boolean amqp = canConnectToRabbit();
        Map<String, Object> body = Map.of("status", db && amqp ? "ok" : "degraded", "db", db, "amqp", amqp);
        return ResponseEntity.status(db && amqp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
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
