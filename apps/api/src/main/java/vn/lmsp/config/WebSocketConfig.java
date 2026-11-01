package vn.lmsp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import vn.lmsp.security.GradingHandshakeInterceptor;
import vn.lmsp.security.GradingWebSocketHandler;
import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final GradingWebSocketHandler handler;
    private final GradingHandshakeInterceptor handshake;
    private final String[] allowedOrigins;
    public WebSocketConfig(GradingWebSocketHandler handler, GradingHandshakeInterceptor handshake,
                           @Value("${lms.cors-origins}") String origins) {
        this.handler = handler;
        this.handshake = handshake;
        this.allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new);
    }
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws").addInterceptors(handshake).setAllowedOriginPatterns(allowedOrigins);
    }
}
