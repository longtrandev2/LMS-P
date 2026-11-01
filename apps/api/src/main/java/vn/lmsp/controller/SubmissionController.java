package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.GradingDtos.Accepted;
import vn.lmsp.dto.GradingDtos.RegradeInput;
import vn.lmsp.dto.GradingDtos.SubmissionDetails;
import vn.lmsp.service.RegradeService;
import vn.lmsp.service.SubmissionReadService;

@RestController
@RequestMapping("/api/v1/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    private final SubmissionReadService submissions;
    private final RegradeService regrades;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','LECTURER','ADMIN')")
    public SubmissionDetails get(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication authentication) {
        return submissions.get(id, Long.valueOf(actor), hasRole(authentication, "ROLE_LECTURER"),
                hasRole(authentication, "ROLE_ADMIN"));
    }

    @PostMapping("/{id}/regrade") @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public Accepted regrade(@PathVariable Long id, @Valid @RequestBody RegradeInput body,
            @AuthenticationPrincipal String actor, Authentication authentication) {
        return regrades.regrade(id, Long.valueOf(actor), hasRole(authentication, "ROLE_ADMIN"), body.reason());
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream().anyMatch(authority -> role.equals(authority.getAuthority()));
    }
}
