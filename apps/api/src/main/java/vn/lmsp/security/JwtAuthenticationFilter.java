package vn.lmsp.security;

import vn.lmsp.service.JwtTokenService;
import vn.lmsp.repository.UserRepository;
import vn.lmsp.enums.UserStatus;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collection;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenService tokens;
    private final UserRepository users;
    public JwtAuthenticationFilter(JwtTokenService tokens, UserRepository users) { this.tokens = tokens; this.users=users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                var claims = tokens.parseAccessToken(header.substring(7));
                Long userId=Long.valueOf(claims.getSubject());
                var user=users.findWithRolesById(userId).orElse(null);
                if(user!=null && user.getStatus()==UserStatus.active) {
                    Collection<SimpleGrantedAuthority> authorities=user.getRoles().stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_"+role.getName().toUpperCase())).toList();
                    var auth=new UsernamePasswordAuthenticationToken(claims.getSubject(),null,authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}

