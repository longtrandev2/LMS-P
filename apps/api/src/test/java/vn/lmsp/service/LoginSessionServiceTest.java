package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.common.LmsException;
import vn.lmsp.model.RefreshToken;
import vn.lmsp.model.User;
import vn.lmsp.repository.RefreshTokenRepository;
import vn.lmsp.repository.UserRepository;

class LoginSessionServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final LoginSessionService service = new LoginSessionService(users, tokens, audit);
    private final User student = user(42, "student");
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach void setup() {
        when(users.existsById(42L)).thenReturn(true);
    }

    @Test void groupsLiveTokensByFamilyWithLoginTimeFromTheFirstToken() {
        RefreshToken newestA = token("A", "10.0.0.9", now.minusMinutes(1), now.minusMinutes(1));
        RefreshToken olderA = token("A", "10.0.0.5", now.minusMinutes(10), now.minusMinutes(2));
        RefreshToken onlyB = token("B", "10.0.0.7", now.minusHours(3), now.minusHours(3));
        when(tokens.findLive(eq(42L), any())).thenReturn(List.of(newestA, olderA, onlyB));
        when(tokens.findFamilyStarts(eq(42L), anyCollection())).thenReturn(List.of(start("A", now.minusDays(2)),
                start("B", now.minusHours(3))));

        var sessions = service.list(42L);

        assertThat(sessions).extracting(s -> s.family()).containsExactly("A", "B");
        var a = sessions.get(0);
        assertThat(a.ip()).isEqualTo("10.0.0.9");
        assertThat(a.created_at()).isEqualTo(now.minusDays(2));
        assertThat(a.last_used_at()).isEqualTo(now.minusMinutes(1));
        assertThat(a.expires_at()).isEqualTo(newestA.getExpiresAt());
        assertThat(sessions.get(1).created_at()).isEqualTo(now.minusHours(3));
    }

    @Test void noLiveTokensMeansNoSessions() {
        when(tokens.findLive(eq(42L), any())).thenReturn(List.of());
        assertThat(service.list(42L)).isEmpty();
        verify(tokens, never()).findFamilyStarts(any(), any());
    }

    @Test void unknownUserIs404() {
        assertNotFound(() -> service.list(99L));
        assertNotFound(() -> service.revokeAll(99L, 1L));
        verifyNoInteractions(tokens, audit);
    }

    @Test void revokeOneFamilyAudits() {
        when(tokens.existsByUser_IdAndSessionFamily(42L, "A")).thenReturn(true);
        when(tokens.revokeFamily(eq(42L), eq("A"), any())).thenReturn(1);

        service.revoke(42L, "A", 1L);

        verify(audit).record(1L, "user.sessions_revoke", "user", 42L, null, Map.of("family", "A", "count", 1));
    }

    @Test void unknownFamilyIs404() {
        assertNotFound(() -> service.revoke(42L, "missing", 1L));
        verify(tokens, never()).revokeFamily(any(), any(), any());
        verifyNoInteractions(audit);
    }

    @Test void revokeAllAudits() {
        when(tokens.revokeAll(eq(42L), any())).thenReturn(3);
        service.revokeAll(42L, 1L);
        verify(audit).record(1L, "user.sessions_revoke", "user", 42L, null, Map.of("family", "all", "count", 3));
    }

    private void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(LmsException.class,
                error -> assertThat(error.getStatus().value()).isEqualTo(404));
    }

    private RefreshToken token(String family, String ip, LocalDateTime createdAt, LocalDateTime lastUsedAt) {
        RefreshToken token = new RefreshToken(student, family + ip, createdAt.plusDays(7), family, ip, "Firefox");
        ReflectionTestUtils.setField(token, "createdAt", createdAt);
        ReflectionTestUtils.setField(token, "lastUsedAt", lastUsedAt);
        return token;
    }

    private static RefreshTokenRepository.FamilyStart start(String family, LocalDateTime at) {
        return new RefreshTokenRepository.FamilyStart() {
            public String getFamily() { return family; }
            public LocalDateTime getStartedAt() { return at; }
        };
    }
}
