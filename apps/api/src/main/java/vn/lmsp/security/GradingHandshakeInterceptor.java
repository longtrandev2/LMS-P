package vn.lmsp.security;

import lombok.RequiredArgsConstructor;
import vn.lmsp.service.JwtTokenService;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import java.net.URI;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GradingHandshakeInterceptor implements HandshakeInterceptor {
    private final JwtTokenService tokens;
    private final vn.lmsp.repository.UserRepository users;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler handler, Map<String, Object> attributes) {
        try {
            URI uri = request.getURI();
            String token = java.util.Arrays.stream(java.util.Optional.ofNullable(uri.getRawQuery()).orElse("").split("&"))
                    .filter(part -> part.startsWith("token=")).map(part -> java.net.URLDecoder.decode(part.substring(6), java.nio.charset.StandardCharsets.UTF_8))
                    .findFirst().orElseThrow();
            String userId = tokens.parseAccessToken(token).getSubject();
            users.findById(Long.valueOf(userId)).filter(user -> user.getStatus() == vn.lmsp.enums.UserStatus.active).orElseThrow();
            attributes.put("userId", userId);
            return true;
        } catch (RuntimeException error) {
            response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return false;
        }
    }
    @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler handler, Exception exception) { }
}

