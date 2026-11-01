package vn.lmsp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.security.GradingWebSocketHandler;

/**
 * Tín hiệu realtime qua WebSocket — docs/message-contracts.md §6.1. Envelope `{type, ts, data}`; chỉ gửi sau khi giao
 * dịch hiện tại commit (không có giao dịch → gửi ngay). Lỗi mã hóa/gửi chỉ ghi log, không bao giờ làm hỏng nghiệp vụ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {
    private final GradingWebSocketHandler sockets;
    private final ObjectMapper json;

    public void toUser(Long userId, String type, Map<String, Object> data) {
        toUsers(userId == null ? List.of() : List.of(userId), type, data);
    }

    public void toUsers(Collection<Long> userIds, String type, Map<String, Object> data) {
        List<String> ids = ids(userIds);
        if (!ids.isEmpty()) afterCommit(type, data, payload -> ids.forEach(id -> sockets.sendToUser(id, payload)));
    }

    /** Các user được nêu cùng mọi admin đang kết nối (mỗi kết nối nhận một lần). */
    public void toUsersAndAdmins(Collection<Long> userIds, String type, Map<String, Object> data) {
        List<String> ids = ids(userIds);
        afterCommit(type, data, payload -> sockets.sendToUsersAndAdmins(ids, payload));
    }

    /** Mọi user đang kết nối. */
    public void toAll(String type, Map<String, Object> data) {
        afterCommit(type, data, sockets::sendToAll);
    }

    private void afterCommit(String type, Map<String, Object> data, Consumer<String> deliver) {
        try {
            Map<String, Object> snapshot = new LinkedHashMap<>(data);
            Runnable send = () -> {
                try {
                    deliver.accept(encode(type, snapshot));
                } catch (RuntimeException error) {
                    log.warn("Cannot deliver realtime signal {}: {}", type, error.toString());
                }
            };
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                send.run();
                return;
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { send.run(); }
            });
        } catch (RuntimeException error) {
            log.warn("Cannot schedule realtime signal {}: {}", type, error.toString());
        }
    }

    private String encode(String type, Map<String, Object> data) {
        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("type", type);
        frame.put("ts", Instant.now().toEpochMilli());
        frame.put("data", data);
        try {
            return json.writeValueAsString(frame);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Cannot encode realtime signal", error);
        }
    }

    private static List<String> ids(Collection<Long> userIds) {
        return userIds.stream().filter(Objects::nonNull).map(String::valueOf).distinct().toList();
    }
}
