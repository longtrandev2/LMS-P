package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.PaperPreviewDtos.PapersPreview;
import vn.lmsp.service.PaperPreviewService;

/** Xem trước đề / mã đề và bốc lại — docs/api-spec.md §7. Quyền: giảng viên phụ trách lớp hoặc admin (kiểm ở service). */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PaperController {
    private final PaperPreviewService previews;

    @GetMapping("/assignments/{id}/papers") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public PapersPreview papers(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return previews.preview(id, Long.valueOf(actor), isAdmin(auth));
    }

    @PostMapping("/assignments/{id}/papers/reseed") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public PapersPreview reseed(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return previews.reseed(id, Long.valueOf(actor), isAdmin(auth));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals("ROLE_ADMIN"));
    }
}
