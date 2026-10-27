package vn.lmsp.security;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class GradingWebSocketHandler extends TextWebSocketHandler {
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper json;

    @Override public void afterConnectionEstablished(WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        sessions.compute(userId, (ignored, userSessions) -> {
            var connections = userSessions == null ? new ConcurrentHashMap<String, WebSocketSession>() : userSessions;
            connections.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 5000, 65536));
            return connections;
        });
    }

    @Override protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            if (message.getPayloadLength() > 1024) return;
            var payload = json.readTree(message.getPayload());
            if (payload != null && "ping".equals(payload.path("type").asText())) {
                String userId = (String) session.getAttributes().get("userId");
                var userSessions = sessions.get(userId);
                WebSocketSession target = userSessions == null ? null : userSessions.get(session.getId());
                if (target != null) send(target, json.writeValueAsString(Map.of(
                        "type", "pong", "ts", Instant.now().toEpochMilli(), "data", Map.of())));
            }
        } catch (java.io.IOException ignored) { }
    }

    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = (String) session.getAttributes().get("userId");
        sessions.computeIfPresent(userId, (ignored, userSessions) -> {
            userSessions.remove(session.getId());
            return userSessions.isEmpty() ? null : userSessions;
        });
    }

    /** Chỉ đọc cho dashboard admin (admin-spec.md §3): số kết nối đang mở. */
    public long connectionCount() { return sessions.values().stream().mapToLong(Map::size).sum(); }

    /** Số user có ít nhất một kết nối. */
    public long userCount() { return sessions.size(); }

    public void sendToUser(String userId, String payload) {
        var userSessions = sessions.get(userId);
        if (userSessions != null) userSessions.values().forEach(session -> send(session, payload));
    }

    private void send(WebSocketSession session, String payload) {
        try {
            if (session.isOpen()) session.sendMessage(new TextMessage(payload));
        } catch (Exception error) {
            try { session.close(CloseStatus.SERVER_ERROR); } catch (java.io.IOException ignored) { }
        }
    }
}
