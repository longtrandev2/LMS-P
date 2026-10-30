package vn.lmsp.security;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class GradingWebSocketHandler extends TextWebSocketHandler {
    /** Thuộc tính phiên WS do {@link GradingHandshakeInterceptor} đặt khi user có vai trò admin. */
    public static final String ADMIN_ATTRIBUTE = "admin";
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper json;

    @Override public void afterConnectionEstablished(WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        if (userId == null) return;
        boolean[] isFirst = new boolean[1];
        sessions.compute(userId, (ignored, userSessions) -> {
            if (userSessions == null) {
                isFirst[0] = true;
                userSessions = new ConcurrentHashMap<>();
            }
            userSessions.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 5000, 65536));
            return userSessions;
        });
        if (isFirst[0]) broadcastPresence(userId, true);
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
        if (userId == null) return;
        boolean[] isLast = new boolean[1];
        sessions.computeIfPresent(userId, (ignored, userSessions) -> {
            userSessions.remove(session.getId());
            if (userSessions.isEmpty()) {
                isLast[0] = true;
                return null;
            }
            return userSessions;
        });
        if (isLast[0]) broadcastPresence(userId, false);
    }

    private void broadcastPresence(String userId, boolean online) {
        try {
            Long uid = Long.valueOf(userId);
            String payload = json.writeValueAsString(Map.of(
                    "type", "presence.changed",
                    "ts", Instant.now().toEpochMilli(),
                    "data", Map.of("user_id", uid, "online", online)));
            sendToAll(payload);
        } catch (Exception ignored) { }
    }

    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        var conns = sessions.get(userId.toString());
        return conns != null && !conns.isEmpty();
    }

    public Set<Long> getOnlineUserIds() {
        Set<Long> result = new java.util.HashSet<>();
        sessions.forEach((idStr, conns) -> {
            if (conns != null && !conns.isEmpty()) {
                try {
                    result.add(Long.valueOf(idStr));
                } catch (NumberFormatException ignored) { }
            }
        });
        return result;
    }

    /** Chỉ đọc cho dashboard admin (admin-spec.md §3): số kết nối đang mở. */
    public long connectionCount() { return sessions.values().stream().mapToLong(Map::size).sum(); }

    /** Số user có ít nhất một kết nối. */
    public long userCount() { return sessions.size(); }

    public void sendToUser(String userId, String payload) {
        var userSessions = sessions.get(userId);
        if (userSessions != null) userSessions.values().forEach(session -> send(session, payload));
    }

    /** Mọi kết nối đang mở (tín hiệu `settings.changed` — message-contracts.md §6.1). */
    public void sendToAll(String payload) {
        sessions.values().forEach(userSessions -> userSessions.values().forEach(session -> send(session, payload)));
    }

    /** Các user được nêu cùng mọi admin đang kết nối; mỗi kết nối nhận đúng một lần. */
    public void sendToUsersAndAdmins(Collection<String> userIds, String payload) {
        Set<String> targets = Set.copyOf(userIds);
        sessions.forEach((userId, userSessions) -> userSessions.values().forEach(session -> {
            if (targets.contains(userId) || Boolean.TRUE.equals(session.getAttributes().get(ADMIN_ATTRIBUTE)))
                send(session, payload);
        }));
    }

    private void send(WebSocketSession session, String payload) {
        try {
            if (session.isOpen()) session.sendMessage(new TextMessage(payload));
        } catch (Exception error) {
            try { session.close(CloseStatus.SERVER_ERROR); } catch (java.io.IOException ignored) { }
        }
    }
}
