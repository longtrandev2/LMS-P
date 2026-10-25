package vn.lmsp.mapper;

import org.springframework.stereotype.Component;
import vn.lmsp.dto.AuditDtos.Item;
import vn.lmsp.model.AuditLog;

@Component
public class AuditMapper {
    public Item toView(AuditLog log) {
        return new Item(log.getId(), log.getActorId(), log.getAction(), log.getEntityType(), log.getEntityId(),
                log.getOldValue(), log.getNewValue(), log.getIp(), log.getCreatedAt());
    }
}
