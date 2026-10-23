package vn.lmsp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.lmsp.dto.AuditDtos.*;
import vn.lmsp.model.AuditLog;
import vn.lmsp.repository.AuditLogRepository;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class AuditService {
    private final AuditLogRepository logs; private final ObjectMapper json;
    public AuditService(AuditLogRepository logs,ObjectMapper json) { this.logs=logs; this.json=json; }
    @Transactional public void record(Long actor,String action,String entity,Long entityId,Map<String,Object> oldValue,Map<String,Object> newValue) {
        logs.save(new AuditLog(actor,action,entity,entityId,encode(oldValue),encode(newValue),clientIp()));
    }
    @Transactional(readOnly=true) public Page list(Long actor,String action,String entity,LocalDateTime from,LocalDateTime to,int page,int limit) {
        var result=logs.search(actor,blankNull(action),blankNull(entity),from,to,PageRequest.of(page-1,limit));
        return new Page(result.getContent().stream().map(this::view).toList(),result.getTotalElements(),page,limit);
    }
    private Item view(AuditLog log) { return new Item(log.getId(),log.getActorId(),log.getAction(),log.getEntityType(),log.getEntityId(),decode(log.getOldValue()),decode(log.getNewValue()),log.getIp(),log.getCreatedAt()); }
    private com.fasterxml.jackson.databind.JsonNode encode(Map<String,Object> value) { return value==null ? null : json.valueToTree(value); }
    private com.fasterxml.jackson.databind.JsonNode decode(com.fasterxml.jackson.databind.JsonNode value) { return value; }
    private String clientIp() { var attributes=RequestContextHolder.getRequestAttributes(); if(attributes instanceof ServletRequestAttributes servlet) { HttpServletRequest request=servlet.getRequest(); String forwarded=request.getHeader("X-Forwarded-For"); return forwarded==null ? request.getRemoteAddr() : forwarded.split(",")[0].trim(); } return null; }
    private static String blankNull(String value) { return value==null || value.isBlank() ? null : value; }
}
