package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AdminDtos.RealtimeView;
import vn.lmsp.dto.AdminDtos.StatsView;
import vn.lmsp.service.AdminRealtimeService;
import vn.lmsp.service.AdminStatsService;

/** Thống kê và realtime cho dashboard admin — docs/admin-spec.md §2, §3. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminStatsController {
    private final AdminStatsService stats;
    private final AdminRealtimeService realtime;

    @GetMapping("/stats")
    public StatsView stats(@RequestParam(defaultValue = "7") int days) {
        return stats.stats(days);
    }

    @GetMapping("/stats/export")
    public ResponseEntity<byte[]> export(@RequestParam(defaultValue = "7") int days) {
        AdminStatsService.Export file = stats.export(days);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }

    @GetMapping("/realtime")
    public RealtimeView realtime() {
        return realtime.realtime();
    }
}
