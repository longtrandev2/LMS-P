package vn.lmsp.controller;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/** IP/User-Agent của phiên đăng nhập — docs/admin-spec.md §6. */
class AuthControllerClientTest {
    @Test void prefersFirstForwardedAddress() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.2");
        request.addHeader("X-Forwarded-For", " 203.0.113.7 , 172.18.0.1");
        request.addHeader("User-Agent", "Mozilla/5.0");
        var client = AuthController.client(request);
        assertThat(client.ip()).isEqualTo("203.0.113.7");
        assertThat(client.userAgent()).isEqualTo("Mozilla/5.0");
    }

    @Test void fallsBackToRemoteAddressAndClipsUserAgent() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("User-Agent", "x".repeat(300));
        var client = AuthController.client(request);
        assertThat(client.ip()).isEqualTo("10.0.0.5");
        assertThat(client.userAgent()).hasSize(255);
    }
}
