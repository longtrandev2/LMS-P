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
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.model.Submission;
import vn.lmsp.security.GradingWebSocketHandler;

/** WS báo trạng thái chấm cho chủ bài, chỉ sau khi DB commit — docs/message-contracts.md §6. */
@Component
@RequiredArgsConstructor
public class GradingNotifier {
    private final GradingWebSocketHandler sockets;
    private final ObjectMapper json;

    public void afterCommit(Submission submission, GradingVerdict verdict, boolean compileError) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("submission_id", submission.getId());
        data.put("status", submission.getStatus());
        data.put("verdict", verdict);
        data.put("compile_error", compileError);
        String userId = submission.getStudentId().toString();
        boolean terminal = submission.isTerminal();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                send(userId, "submission.status", data);
                if (terminal) send(userId, "submission.graded", data);
            }
        });
    }

    private void send(String userId, String event, Map<String, Object> data) {
        try {
            sockets.sendToUser(userId, json.writeValueAsString(Map.of("type", event, "ts", Instant.now().toEpochMilli(), "data", data)));
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Cannot encode grading update", error);
        }
    }
}
