package vn.lmsp.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AdminDtos.LoginSessionView;
import vn.lmsp.service.LoginSessionService;

/** Phiên đăng nhập của người dùng — docs/admin-spec.md §6, docs/api-spec.md §9. */
@RestController
@RequestMapping("/api/v1/admin/users/{id}/sessions")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserSessionController {
    private final LoginSessionService sessions;

    @GetMapping
    public List<LoginSessionView> list(@PathVariable Long id) { return sessions.list(id); }

    @DeleteMapping("/{family}")
    public ResponseEntity<Void> revoke(@PathVariable Long id, @PathVariable String family, @AuthenticationPrincipal String actor) {
        sessions.revoke(id, family, Long.valueOf(actor));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> revokeAll(@PathVariable Long id, @AuthenticationPrincipal String actor) {
        sessions.revokeAll(id, Long.valueOf(actor));
        return ResponseEntity.noContent().build();
    }
}
