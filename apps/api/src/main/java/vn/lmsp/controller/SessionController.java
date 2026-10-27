package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.ScheduleDtos.*;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.service.SessionGenerateService;
import vn.lmsp.service.SessionService;

/** Buổi học — api-spec §11. RBAC chi tiết (giảng viên phụ trách/sinh viên của lớp) kiểm tra ở service. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SessionController {
    private final SessionService sessions;
    private final SessionGenerateService generator;

    @GetMapping("/classes/{classId}/sessions")
    public SessionList list(@PathVariable Long classId, @RequestParam(required = false) SessionMode mode,
                            @RequestParam(required = false) String q, @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.list(classId, Long.valueOf(actor), isAdmin(auth), mode, q);
    }

    @PostMapping("/classes/{classId}/sessions") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public SessionView create(@PathVariable Long classId, @Valid @RequestBody SessionInput body,
                              @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.create(classId, body, Long.valueOf(actor), isAdmin(auth));
    }

    @PostMapping("/classes/{classId}/sessions/generate") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public GenerateResult generate(@PathVariable Long classId, @Valid @RequestBody GenerateInput body,
                                   @AuthenticationPrincipal String actor, Authentication auth) {
        return generator.generate(classId, body, Long.valueOf(actor), isAdmin(auth));
    }

    @PatchMapping("/sessions/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public SessionView update(@PathVariable Long id, @Valid @RequestBody SessionPatch body,
                              @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.update(id, body, Long.valueOf(actor), isAdmin(auth));
    }

    @DeleteMapping("/sessions/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        sessions.delete(id, Long.valueOf(actor), isAdmin(auth));
    }

    static boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
