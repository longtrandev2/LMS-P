package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.SessionFixtures.*;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.StartSessionInput;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.*;
import vn.lmsp.support.TestSettings;

/** Chế độ bảo trì chặn đúng các thao tác "bắt đầu việc mới" — docs/admin-spec.md §5.2. */
class MaintenanceGuardTest {
    private final SystemSettingsService settings = TestSettings.maintenance("Nâng cấp máy chấm đến 22h");

    @Test void guardThrows503WithMessageButAdminAndDisabledPass() {
        assertMaintenance(() -> settings.check(false), "Nâng cấp máy chấm đến 22h");
        assertThatCode(() -> settings.check(true)).doesNotThrowAnyException();
        assertThatCode(() -> TestSettings.defaults().check(false)).doesNotThrowAnyException();
        assertMaintenance(() -> TestSettings.maintenance(null).check(false), "Hệ thống đang bảo trì, vui lòng thử lại sau");
    }

    @Test void newSessionIsBlockedButInProgressSessionResumes() {
        var access = mock(SessionAccess.class);
        var sessions = mock(AttemptSessionRepository.class);
        var papers = mock(PaperProvider.class);
        var events = mock(SessionEventService.class);
        var service = new AttemptSessionStartService(mock(PlatformTransactionManager.class), access, sessions,
                mock(UserRepository.class), papers, mock(ExamEligibilityService.class), events, mock(AuditService.class),
                mock(AttemptSessionAssembler.class), settings);
        var assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
        when(access.lockedStudentAssignment(50L, 42L)).thenReturn(assignment);
        when(sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(50L, 42L, AttemptSessionStatus.in_progress))
                .thenReturn(Optional.empty());

        assertMaintenance(() -> service.start(50L, 42L, new StartSessionInput(true)), "Nâng cấp máy chấm đến 22h");
        verify(sessions, never()).saveAndFlush(any());

        AttemptSession existing = session(assignment, paper(assignment, null), List.of(), UtcTime.now().plusMinutes(10));
        when(sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(50L, 42L, AttemptSessionStatus.in_progress))
                .thenReturn(Optional.of(existing));
        assertThat(service.start(50L, 42L, new StartSessionInput(null)).created()).isFalse();
        verify(events).record(eq(existing), eq(SessionEventType.resumed), any(), isNull());
        verify(papers, never()).paperForNewSession(any(), any(), anyInt());
    }

    @Test void legacyQuizAndPerQuestionSubmissionsAreBlocked() {
        var access = mock(AssignmentAccess.class);
        var quiz = new QuizAttemptService(access, mock(AssignmentQuestionRepository.class),
                mock(AssignmentAttemptRepository.class), mock(SubmissionRepository.class), mock(UserRepository.class),
                mock(QuestionVersionService.class), new SubmissionMapper(), mock(AuditService.class), new SubmissionPolicy(),
                new AnswerNormalizer(), new ObjectiveGrader(), new ReviewPolicy(), mock(AttemptSessionRepository.class),
                mock(SessionPaperReader.class), settings);
        var objective = new AssignmentSubmissionService(access, mock(AssignmentQuestionRepository.class),
                mock(SubmissionRepository.class), mock(UserRepository.class), mock(QuestionVersionService.class),
                new SubmissionMapper(), new SubmissionPolicy(), new AnswerNormalizer(), new ObjectiveGrader(),
                new ReviewPolicy(), settings);
        var code = new ProgrammingSubmissionService(access, mock(AssignmentQuestionRepository.class),
                mock(SubmissionRepository.class), mock(GradingJobRepository.class), mock(UserRepository.class),
                mock(QuestionVersionService.class), new SubmissionPolicy(), new GradingMapper(), mock(AuditService.class), settings);

        assertMaintenance(() -> quiz.submitQuiz(50L, 42L, "key", null), "Nâng cấp");
        assertMaintenance(() -> objective.submitQuestion(50L, 100L, 42L, "key", null), "Nâng cấp");
        assertMaintenance(() -> code.submit(50L, 100L, 42L, "key", null), "Nâng cấp");
        verifyNoInteractions(access);
    }

    @Test void practiceRunsAreBlockedIncludingInsideSessions() {
        var runs = mock(RunJobGateway.class);
        var practice = new PracticeRunService(mock(AssignmentAccess.class), mock(AssignmentQuestionRepository.class),
                mock(QuestionVersionService.class), new SubmissionPolicy(), new PracticeRateLimiter(settings), runs, settings);
        var link = link(assignment(AssignmentCategory.ASSIGNMENT), question(100, vn.lmsp.enums.QuestionType.programming), "1", 1);

        assertMaintenance(() -> practice.runPinned(link, 42L, new PracticeRunInput("python", "print(1)", "1")), "Nâng cấp");
        verifyNoInteractions(runs);
    }

    @Test void leaveRequestAndMaterialUploadAreBlocked() {
        var sessions = mock(ClassSessionRepository.class);
        var leaves = new LeaveRequestService(mock(LeaveRequestRepository.class), sessions, mock(UserRepository.class),
                mock(ClassAccess.class), mock(LeaveEvidenceStorage.class), mock(NotificationService.class),
                new ScheduleMapper(), settings);
        var classes = mock(ClassRepository.class);
        var materials = new MaterialService(mock(MaterialRepository.class), classes, mock(EnrollmentRepository.class),
                mock(UserRepository.class), mock(NotificationService.class), mock(AuditService.class),
                new vn.lmsp.mapper.MaterialMapper(), mock(ClassSessionRepository.class), settings, settings, "./storage");

        assertMaintenance(() -> leaves.create(7L, 42L, "Ốm", null), "Nâng cấp");
        assertMaintenance(() -> materials.upload(3L, 9L, "Slide", null, null, null), "Nâng cấp");
        verifyNoInteractions(sessions, classes);
    }

    private static void assertMaintenance(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String message) {
        assertThatThrownBy(call).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("MAINTENANCE");
            assertThat(error.getStatus().value()).isEqualTo(503);
            assertThat(error.getMessage()).contains(message);
        });
    }
}
