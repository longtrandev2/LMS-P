package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.mapper.NotificationMapper;
import vn.lmsp.model.Notification;
import vn.lmsp.repository.NotificationRepository;
import vn.lmsp.repository.UserRepository;
import vn.lmsp.security.GradingWebSocketHandler;

class RealtimePublisherTest {
    private final GradingWebSocketHandler sockets = mock(GradingWebSocketHandler.class);
    private final ObjectMapper json = new ObjectMapper();
    private final RealtimePublisher publisher = new RealtimePublisher(sockets, json);

    @AfterEach void clear() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization();
    }

    @Test void sendsOnlyAfterCommitWithEnvelope() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        publisher.toUser(42L, "notification.created", Map.of("notification_id", 5, "type", "grade.updated"));
        verifyNoInteractions(sockets);

        commit();

        verify(sockets).sendToUser(eq("42"), argThat(payload -> {
            try {
                var frame = json.readTree(payload);
                return frame.path("type").asText().equals("notification.created") && frame.path("ts").asLong() > 0
                        && frame.path("data").path("notification_id").asInt() == 5;
            } catch (Exception error) { return false; }
        }));
    }

    @Test void rollbackSendsNothing() {
        TransactionSynchronizationManager.initSynchronization();
        publisher.toAll("settings.changed", Map.of("keys", List.of("maintenance")));
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verifyNoInteractions(sockets);
    }

    @Test void withoutTransactionSendsImmediatelyAndDedupesRecipients() {
        publisher.toAll("settings.changed", Map.of("keys", List.of("maintenance")));
        publisher.toUsersAndAdmins(List.of(7L, 7L), "exam.session_changed", Map.of("session_id", 1));
        verify(sockets).sendToAll(contains("\"settings.changed\""));
        verify(sockets).sendToUsersAndAdmins(eq(List.of("7")), contains("\"exam.session_changed\""));
    }

    @Test void socketFailureNeverReachesTheCaller() {
        doThrow(new IllegalStateException("socket down")).when(sockets).sendToUser(any(), any());
        TransactionSynchronizationManager.initSynchronization();
        publisher.toUser(42L, "notification.created", Map.of("notification_id", 5, "type", "x"));
        assertThatCode(this::commit).doesNotThrowAnyException();
        assertThatCode(() -> publisher.toUser(null, "x", Map.of())).doesNotThrowAnyException();
    }

    @Test void notificationCreateSignalsOwnerAndSurvivesSocketFailure() {
        var notifications = mock(NotificationRepository.class);
        var users = mock(UserRepository.class);
        when(users.findById(42L)).thenReturn(Optional.of(user(42, "student")));
        when(notifications.save(any())).thenAnswer(call -> identified((Notification) call.getArgument(0), 77));
        doThrow(new IllegalStateException("socket down")).when(sockets).sendToUser(any(), any());
        var service = new NotificationService(notifications, users, json, mock(NotificationMapper.class), publisher);

        assertThatCode(() -> service.create(42L, "system.announcement", "Bảo trì", null, null)).doesNotThrowAnyException();

        verify(notifications).save(any());
        verify(sockets).sendToUser(eq("42"), argThat(payload -> payload.contains("\"notification_id\":77")
                && payload.contains("\"type\":\"system.announcement\"")));
    }

    private void commit() {
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
    }
}
