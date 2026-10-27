package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AdminDtos.AnnouncementCreated;
import vn.lmsp.dto.AdminDtos.AnnouncementInput;
import vn.lmsp.dto.AdminDtos.AnnouncementPage;
import vn.lmsp.service.AnnouncementService;

/** Thông báo hệ thống — docs/admin-spec.md §5.1, docs/api-spec.md §9. */
@RestController
@RequestMapping("/api/v1/admin/announcements")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAnnouncementController {
    private final AnnouncementService announcements;

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementCreated create(@Valid @RequestBody AnnouncementInput body, @AuthenticationPrincipal String actor) {
        return announcements.create(body, Long.valueOf(actor));
    }

    @GetMapping
    public AnnouncementPage list(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
        if (page < 1 || limit < 1 || limit > 100) throw new IllegalArgumentException("page hoặc limit không hợp lệ");
        return announcements.list(page, limit);
    }
}
