package vn.lmsp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.lmsp.service.ActivityTracker;

/**
 * Ghi nhận user có request REST đã xác thực (đứng sau JwtAuthenticationFilter) — docs/admin-spec.md §3.
 * Không phải bean để Spring Boot không đăng ký thêm một lần ở servlet container; SecurityConfig tạo trực tiếp.
 */
public class ActivityTrackingFilter extends OncePerRequestFilter {
    private final ActivityTracker tracker;

    public ActivityTrackingFilter(ActivityTracker tracker) { this.tracker = tracker; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof UsernamePasswordAuthenticationToken && auth.isAuthenticated()
                && auth.getPrincipal() instanceof String subject) {
            try {
                tracker.touch(Long.valueOf(subject), auth.getAuthorities().stream()
                        .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", "").toLowerCase(Locale.ROOT))
                        .toList());
            } catch (NumberFormatException ignored) { }
        }
        chain.doFilter(request, response);
    }
}
