package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AdminDtos.PublicSettings;
import vn.lmsp.dto.AdminDtos.SettingsUpdate;
import vn.lmsp.dto.AdminDtos.SettingsView;
import vn.lmsp.service.SettingsAdminService;
import vn.lmsp.service.SystemSettingsService;

/** Cấu hình hệ thống — docs/api-spec.md §9, docs/admin-spec.md §1. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SettingsController {
    private final SettingsAdminService admin;
    private final SystemSettingsService settings;

    @GetMapping("/admin/settings") @PreAuthorize("hasRole('ADMIN')")
    public SettingsView list() { return admin.view(); }

    @PutMapping("/admin/settings") @PreAuthorize("hasRole('ADMIN')")
    public SettingsView update(@Valid @RequestBody SettingsUpdate body, @AuthenticationPrincipal String actor) {
        return admin.update(body, Long.valueOf(actor));
    }

    /** Mọi người dùng đã đăng nhập: giới hạn cho form và trạng thái bảo trì. */
    @GetMapping("/settings/public")
    public PublicSettings publicSettings() { return settings.publicSettings(); }
}
