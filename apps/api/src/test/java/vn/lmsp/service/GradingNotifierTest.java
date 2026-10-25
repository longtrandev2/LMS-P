package vn.lmsp.service;

import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.dto.GradingDtos.WorkerPayload;
import vn.lmsp.enums.*;
import vn.lmsp.model.Submission;
import vn.lmsp.security.GradingWebSocketHandler;

class GradingNotifierTest {
    @Test void websocketIsSentOnlyAfterCommitAndUsesTheSubmissionOwner() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        var submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "code", false, 0, "key", LocalDateTime.now()), 90);
        submission.startGrading();
        var sockets = mock(GradingWebSocketHandler.class);
        var notifier = new GradingNotifier(sockets, new ObjectMapper());
        var payload = new WorkerPayload("job", 90L, SubmissionStatus.grading, false, null, null, null, null);
        TransactionSynchronizationManager.initSynchronization();
        try {
            notifier.afterCommit(submission, payload);
            verifyNoInteractions(sockets);
            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            verify(sockets).sendToUser(eq("42"), contains("\"submission.status\""));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
