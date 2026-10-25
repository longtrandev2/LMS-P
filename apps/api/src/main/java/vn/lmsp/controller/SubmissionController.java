package vn.lmsp.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.GradingDtos.SubmissionDetails;
import vn.lmsp.service.SubmissionReadService;

@RestController
@RequestMapping("/api/v1/submissions")
public class SubmissionController {
    private final SubmissionReadService submissions;

    public SubmissionController(SubmissionReadService submissions) { this.submissions = submissions; }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','LECTURER','ADMIN')")
    public SubmissionDetails get(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication authentication) {
        return submissions.get(id, Long.valueOf(actor), hasRole(authentication, "ROLE_LECTURER"),
                hasRole(authentication, "ROLE_ADMIN"));
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream().anyMatch(authority -> role.equals(authority.getAuthority()));
    }
}
