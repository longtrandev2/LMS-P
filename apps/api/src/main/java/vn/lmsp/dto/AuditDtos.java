package vn.lmsp.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;

public final class AuditDtos {
    private AuditDtos() { }
    public record Item(Long id,Long actor_id,String action,String entity_type,Long entity_id,
                       JsonNode old_value,JsonNode new_value,String ip,LocalDateTime created_at) { }
    public record Page(List<Item> items,long total,int page,int limit) { }
}
