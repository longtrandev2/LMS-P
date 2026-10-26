package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.NotificationDtos.*;
import vn.lmsp.service.NotificationService;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService service;
    @GetMapping public Page list(@AuthenticationPrincipal String actor, @RequestParam(required=false) Boolean is_read,
                                @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.list(Long.valueOf(actor), is_read, page, checkedLimit(limit));
    }
    @PatchMapping("/{id}/read") public Item read(@AuthenticationPrincipal String actor, @PathVariable Long id) {
        return service.markRead(Long.valueOf(actor), id);
    }
    @PatchMapping("/read-all") public ReadAll readAll(@AuthenticationPrincipal String actor) {
        return service.markAllRead(Long.valueOf(actor));
    }
    private int checkedLimit(int limit) { if(pageInvalid(limit)) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
    private boolean pageInvalid(int limit) { return limit < 1 || limit > 100; }
}
