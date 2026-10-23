package vn.lmsp.security;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class GradingWebSocketHandler extends TextWebSocketHandler {
    private final ConcurrentHashMap<String, CopyOnWriteArraySet<WebSocketSession>> sessions = new ConcurrentHashMap<>();
    @Override public void afterConnectionEstablished(WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        sessions.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(session);
    }
    @Override protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        if ("{\"type\":\"ping\"}".equals(message.getPayload()) && session.isOpen()) {
            try { session.sendMessage(new TextMessage("{\"type\":\"pong\"}")); } catch (Exception ignored) { }
        }
    }
    @Override public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        String userId = (String) session.getAttributes().get("userId");
        var userSessions = sessions.get(userId);
        if (userSessions != null) { userSessions.remove(session); if (userSessions.isEmpty()) sessions.remove(userId); }
    }
    public void sendToUser(String userId, String json) {
        var userSessions = sessions.get(userId);
        if (userSessions == null) return;
        userSessions.removeIf(session -> !session.isOpen());
        userSessions.forEach(session -> { try { session.sendMessage(new TextMessage(json)); } catch (Exception ignored) { } });
    }
}
