package vn.lmsp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import vn.lmsp.security.GradingWebSocketHandler;
import java.time.Instant;
import java.util.Map;

@Component
public class GradingEventListener {
    private final ObjectMapper mapper;
    private final GradingWebSocketHandler sockets;
    public GradingEventListener(ObjectMapper mapper, GradingWebSocketHandler sockets) {
        this.mapper = mapper;
        this.sockets = sockets;
    }

    @RabbitListener(queues = "q.events")
    public void onEvent(byte[] body) throws Exception {
        JsonNode event = mapper.readTree(body);
        String name = event.path("event").asText(event.path("type").asText(""));
        String userId = event.path("user_id").asText("");
        if (userId.isBlank() || !name.startsWith("submission.")) return;
        JsonNode payload = event.path("payload").isMissingNode() ? mapper.createObjectNode() : event.path("payload");
        sockets.sendToUser(userId, mapper.writeValueAsString(Map.of(
                "type", name, "ts", Instant.now().toEpochMilli(), "data", payload)));
    }
}
