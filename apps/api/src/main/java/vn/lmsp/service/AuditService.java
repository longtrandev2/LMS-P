package vn.lmsp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.lmsp.dto.AuditDtos.*;
import vn.lmsp.mapper.AuditMapper;
import vn.lmsp.model.AuditLog;
import vn.lmsp.repository.AuditLogRepository;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository logs; private final ObjectMapper json;
    private final AuditMapper mapper;
    @Transactional public void record(Long actor,String action,String entity,Long entityId,Map<String,Object> oldValue,Map<String,Object> newValue) {
        logs.save(new AuditLog(actor,action,entity,entityId,encode(oldValue),encode(newValue),clientIp()));
    }
    @Transactional(readOnly=true) public Page list(Long actor,String action,String entity,LocalDateTime from,LocalDateTime to,int page,int limit) {
        var result=logs.search(actor,blankNull(action),blankNull(entity),from,to,PageRequest.of(page-1,limit));
        return new Page(result.getContent().stream().map(mapper::toView).toList(),result.getTotalElements(),page,limit);
    }
    private com.fasterxml.jackson.databind.JsonNode encode(Map<String,Object> value) { return value==null ? null : json.valueToTree(value); }
    private String clientIp() { var attributes=RequestContextHolder.getRequestAttributes(); if(attributes instanceof ServletRequestAttributes servlet) { HttpServletRequest request=servlet.getRequest(); String forwarded=request.getHeader("X-Forwarded-For"); return forwarded==null ? request.getRemoteAddr() : forwarded.split(",")[0].trim(); } return null; }
    private static String blankNull(String value) { return value==null || value.isBlank() ? null : value; }
}
