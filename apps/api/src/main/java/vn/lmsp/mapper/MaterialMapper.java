package vn.lmsp.mapper;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.MaterialDtos.Item;
import vn.lmsp.model.Material;

@Component
public class MaterialMapper {
    public Item toView(Material material) {
        return new Item(material.getId(), material.getClassId(), material.getTitle(), material.getDescription(),
                material.getType(), material.getFilePath(), material.getSizeBytes(),
                material.getUploadedBy(), material.getCreatedAt(), material.getSessionId());
    }

    public Map<String, Object> toAuditValue(Material material) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("title", material.getTitle());
        value.put("description", material.getDescription());
        value.put("session_id", material.getSessionId());
        return value;
    }
}
