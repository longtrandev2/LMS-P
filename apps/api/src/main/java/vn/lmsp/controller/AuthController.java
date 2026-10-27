package vn.lmsp.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
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
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    @PostMapping("/login") public TokenPair login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return auth.login(request.email(), request.password(), client(http));
    }
    @PostMapping("/refresh") public TokenPair refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest http) {
        return auth.refresh(request.refreshToken(), client(http));
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
    /** nginx đứng trước API: ưu tiên giá trị đầu của X-Forwarded-For — docs/admin-spec.md §6. */
    static AuthService.Client client(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank() ? http.getRemoteAddr() : forwarded.split(",")[0].trim();
        return new AuthService.Client(clip(ip, 45), clip(http.getHeader(HttpHeaders.USER_AGENT), 255));
    }
    private static String clip(String value, int max) {
        if (value == null || value.isBlank()) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
