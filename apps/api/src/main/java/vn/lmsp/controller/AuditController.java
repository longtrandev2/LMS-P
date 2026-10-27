package vn.lmsp.controller;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AuditDtos.Page;
import vn.lmsp.repository.AuditExportQueries.Filter;
import vn.lmsp.service.AuditExportService;
import vn.lmsp.service.AuditService;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuditController {
    private final AuditService audit;
    private final AuditExportService exports;
    @GetMapping public Page list(@RequestParam(required=false) Long actor_id,@RequestParam(required=false) String action,
                                 @RequestParam(required=false) String entity_type,@RequestParam(required=false) LocalDateTime from,
                                 @RequestParam(required=false) LocalDateTime to,@RequestParam(defaultValue="1") int page,
                                 @RequestParam(defaultValue="20") int limit) {
        if(page<1 || limit<1 || limit>100) throw new IllegalArgumentException("page hoặc limit không hợp lệ");
        validateRange(from,to);
        return audit.list(actor_id,action,entity_type,from,to,page,limit);
    }

    /** CSV theo cùng bộ lọc với danh sách, ghi thẳng ra response theo lô (admin-spec.md §7). */
    @GetMapping("/export")
    public void export(@RequestParam(required=false) Long actor_id,@RequestParam(required=false) String action,
                       @RequestParam(required=false) String entity_type,@RequestParam(required=false) LocalDateTime from,
                       @RequestParam(required=false) LocalDateTime to,HttpServletResponse response) throws IOException {
        validateRange(from,to);
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(AuditExportService.FILENAME).build().toString());
        exports.write(new Filter(actor_id,blankNull(action),blankNull(entity_type),from,to),response.getOutputStream());
    }

    private static void validateRange(LocalDateTime from,LocalDateTime to) {
        if(from!=null && to!=null && !to.isAfter(from)) throw new IllegalArgumentException("to phải sau from");
    }
    private static String blankNull(String value) { return value==null || value.isBlank() ? null : value; }
}
