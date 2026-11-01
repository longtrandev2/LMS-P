package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

public final class MaterialDtos {
    private MaterialDtos() { }
    /** `session_id` = buổi học gắn kèm (null = học liệu chung của lớp). */
    public record Item(Long id, Long class_id, String title, String description, String type,
                       String file_path, long size_bytes, Long uploaded_by, LocalDateTime created_at, Long session_id) { }
    public record Page(List<Item> items, long total, int page, int limit) { }
    public record LinkInput(String title, String description, String url, Long session_id) { }

    /** PATCH: có khóa `session_id` thì gán (null = gỡ khỏi buổi); không có khóa thì giữ nguyên. */
    public static final class UpdateInput {
        private String title;
        private String description;
        private Long sessionId;
        private boolean sessionIdPresent;
        public String title() { return title; }
        public String description() { return description; }
        public Long sessionId() { return sessionId; }
        public boolean sessionIdPresent() { return sessionIdPresent; }
        @JsonProperty("title") public void setTitle(String title) { this.title = title; }
        @JsonProperty("description") public void setDescription(String description) { this.description = description; }
        @JsonProperty("session_id") public void setSessionId(Long sessionId) { this.sessionId = sessionId; this.sessionIdPresent = true; }
    }
}
