package vn.lmsp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.dto.GradingDtos.WorkerPayload;
import vn.lmsp.enums.TestResultStatus;
import vn.lmsp.model.Submission;
import vn.lmsp.security.GradingWebSocketHandler;

@Component
public class GradingNotifier {
    private final GradingWebSocketHandler sockets;
    private final ObjectMapper json;

    public GradingNotifier(GradingWebSocketHandler sockets, ObjectMapper json) {
        this.sockets = sockets; this.json = json;
    }

    public void afterCommit(Submission submission, WorkerPayload payload) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("submission_id", submission.getId());
        data.put("status", submission.getStatus());
        data.put("score", submission.getScore());
        var tests = payload.test_results() == null ? java.util.List.<vn.lmsp.dto.GradingDtos.WorkerTestResult>of() : payload.test_results();
        data.put("total_tests", tests.size());
        data.put("passed_tests", tests.stream().filter(test -> test.status() == TestResultStatus.passed).count());
        data.put("compile_error", payload.compile_error());
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
