package vn.lmsp.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;

public final class NotificationDtos {
    private NotificationDtos() { }
    public record Item(Long id, String type, String title, String body, JsonNode data, boolean is_read, LocalDateTime created_at) { }
    public record Page(List<Item> items, long total, int page, int limit) { }
    public record ReadAll(int updated) { }
}
