package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.LoginRequest;
import vn.lmsp.dto.RefreshRequest;
import vn.lmsp.dto.TokenPair;
import vn.lmsp.dto.UserSummary;
import vn.lmsp.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }
    @PostMapping("/login") public TokenPair login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.account(), request.password());
    }
    @PostMapping("/refresh") public TokenPair refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }
    @PostMapping("/logout") public ResponseEntity<Void> logout(@AuthenticationPrincipal String userId,
                                                                @RequestBody(required = false) RefreshRequest request) {
        if (request != null && request.refreshToken() != null) auth.logout(request.refreshToken());
        else auth.logoutAll(Long.valueOf(userId));
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/me") public UserSummary me(@AuthenticationPrincipal String userId) {
        return auth.me(Long.valueOf(userId));
    }
}
