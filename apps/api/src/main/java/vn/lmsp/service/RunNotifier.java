package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.model.RunJob;
import vn.lmsp.security.GradingWebSocketHandler;

/** WS `run.completed` cho người tạo job, gửi sau commit (message-contracts.md §6). Frame không chứa code/test. */
@Component
@RequiredArgsConstructor
public class RunNotifier {
    private final GradingWebSocketHandler sockets;
    private final ObjectMapper json;

    public void afterCommit(RunJob job) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("run_id", job.getJobId());
        data.put("status", job.getStatus());
        data.put("verdict", job.getVerdict());
        String userId = job.getRequestedBy().toString();
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            send(userId, data);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { send(userId, data); }
        });
    }

    private void send(String userId, Map<String, Object> data) {
        try {
            sockets.sendToUser(userId, json.writeValueAsString(Map.of(
                    "type", "run.completed", "ts", Instant.now().toEpochMilli(), "data", data)));
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Cannot encode run update", error);
        }
    }
}
