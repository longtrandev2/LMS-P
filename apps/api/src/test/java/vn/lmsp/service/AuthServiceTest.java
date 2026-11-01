package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.lmsp.common.LmsException;
import vn.lmsp.mapper.UserMapper;
import vn.lmsp.model.RefreshToken;
import vn.lmsp.model.User;
import vn.lmsp.repository.RefreshTokenRepository;
import vn.lmsp.repository.UserRepository;

/** Phiên đăng nhập theo family — docs/admin-spec.md §6. */
class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final AuthService service = new AuthService(users, tokens, passwords, mock(JwtTokenService.class),
            mock(UserMapper.class), 7);
    private final User student = user(42, "student");

    @BeforeEach void setup() {
        when(users.findByEmailIgnoreCase("student@test.local")).thenReturn(Optional.of(student));
        when(users.findWithRolesById(42L)).thenReturn(Optional.of(student));
        when(passwords.matches("secret", student.getPasswordHash())).thenReturn(true);
        when(tokens.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test void eachLoginStartsANewFamilyWithClientInfo() {
        service.login("student@test.local", "secret", new AuthService.Client("10.0.0.5", "Firefox"));
        service.login("student@test.local", "secret", new AuthService.Client("10.0.0.6", "Chrome"));

        var saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(tokens, times(2)).save(saved.capture());
        RefreshToken first = saved.getAllValues().get(0), second = saved.getAllValues().get(1);
        assertThat(first.getSessionFamily()).hasSize(36).isNotEqualTo(second.getSessionFamily());
        assertThat(first.getIp()).isEqualTo("10.0.0.5");
        assertThat(first.getUserAgent()).isEqualTo("Firefox");
        assertThat(first.getLastUsedAt()).isEqualTo(first.getCreatedAt());
    }

    @Test void refreshKeepsTheFamilyRevokesTheOldTokenAndUpdatesClientInfo() {
        RefreshToken old = new RefreshToken(student, hash("old-token"), java.time.LocalDateTime.now().plusDays(1),
                "family-1", "10.0.0.5", "Firefox");
        when(tokens.findByTokenHash(hash("old-token"))).thenReturn(Optional.of(old));

        var pair = service.refresh("old-token", new AuthService.Client("10.0.0.9", "Firefox 2"));

        assertThat(old.getRevokedAt()).isNotNull();
        var saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(tokens).save(saved.capture());
        assertThat(saved.getValue().getSessionFamily()).isEqualTo("family-1");
        assertThat(saved.getValue().getIp()).isEqualTo("10.0.0.9");
        assertThat(saved.getValue().getUserAgent()).isEqualTo("Firefox 2");
        assertThat(saved.getValue().getLastUsedAt()).isNotNull();
        assertThat(saved.getValue().getTokenHash()).isEqualTo(hash(pair.refresh_token()));
    }

    @Test void revokedTokenCannotBeReused() {
        RefreshToken old = new RefreshToken(student, hash("old-token"), java.time.LocalDateTime.now().plusDays(1),
                "family-1", null, null);
        old.revoke();
        when(tokens.findByTokenHash(hash("old-token"))).thenReturn(Optional.of(old));

        assertThatThrownBy(() -> service.refresh("old-token", AuthService.Client.UNKNOWN))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("UNAUTHENTICATED"));
        verify(tokens, never()).save(any());
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
}
