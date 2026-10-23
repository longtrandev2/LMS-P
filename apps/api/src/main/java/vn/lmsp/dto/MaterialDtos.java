package vn.lmsp.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class MaterialDtos {
    private MaterialDtos() { }
    public record Item(Long id, Long class_id, String title, String description, String type,
                       String file_path, long size_bytes, Long uploaded_by, LocalDateTime created_at) { }
    public record Page(List<Item> items, long total, int page, int limit) { }
}
