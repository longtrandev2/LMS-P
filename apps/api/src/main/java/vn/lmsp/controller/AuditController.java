package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AuditDtos.Page;
import vn.lmsp.service.AuditService;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuditController {
    private final AuditService audit;
    @GetMapping public Page list(@RequestParam(required=false) Long actor_id,@RequestParam(required=false) String action,
                                 @RequestParam(required=false) String entity_type,@RequestParam(required=false) LocalDateTime from,
                                 @RequestParam(required=false) LocalDateTime to,@RequestParam(defaultValue="1") int page,
                                 @RequestParam(defaultValue="20") int limit) {
        if(page<1 || limit<1 || limit>100) throw new IllegalArgumentException("page hoặc limit không hợp lệ");
        if(from!=null && to!=null && !to.isAfter(from)) throw new IllegalArgumentException("to phải sau from");
        return audit.list(actor_id,action,entity_type,from,to,page,limit);
    }
}
