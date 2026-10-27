package vn.lmsp.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionSummary;
import vn.lmsp.dto.AttemptSessionDtos.ExtendInput;
import vn.lmsp.dto.AttemptSessionDtos.ForceSubmitInput;
import vn.lmsp.dto.AttemptSessionDtos.MonitorTable;
import vn.lmsp.dto.AttemptSessionDtos.SessionEventView;
import vn.lmsp.service.SessionAdminService;
import vn.lmsp.service.SessionMonitorService;

/** Giám sát và can thiệp phiên làm bài (giảng viên phụ trách/admin) — docs/api-spec.md §7, docs/exam-spec.md §5.6, §7. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SessionMonitorController {
    private final SessionMonitorService monitor;
    private final SessionAdminService sessions;

    @GetMapping("/assignments/{id}/sessions") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public MonitorTable monitor(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return monitor.monitor(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/attempt-sessions/{id}/extend") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public AttemptSessionSummary extend(@PathVariable Long id, @Valid @RequestBody ExtendInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.extend(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/attempt-sessions/{id}/force-submit") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public AttemptSessionSummary forceSubmit(@PathVariable Long id, @Valid @RequestBody ForceSubmitInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.forceSubmit(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @GetMapping("/attempt-sessions/{id}/events") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public List<SessionEventView> events(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return sessions.events(id, Long.valueOf(actor), isAdmin(auth));
    }
    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals("ROLE_ADMIN"));
    }
}
