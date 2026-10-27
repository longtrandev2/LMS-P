package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.SessionFixtures.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.StartSessionInput;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.UserRepository;

class AttemptSessionStartServiceTest {
    private final SessionAccess access = mock(SessionAccess.class);
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PaperProvider papers = mock(PaperProvider.class);
    private final ExamEligibilityService eligibility = mock(ExamEligibilityService.class);
    private final SessionEventService events = mock(SessionEventService.class);
    private final AuditService audit = mock(AuditService.class);
    private final AttemptSessionAssembler assembler = mock(AttemptSessionAssembler.class);
    private final AttemptSessionStartService service = new AttemptSessionStartService(mock(PlatformTransactionManager.class),
            access, sessions, users, papers, eligibility, events, audit, assembler);
    private final StartSessionInput accept = new StartSessionInput(true);
    private Assignment assignment;
    private AssessmentPaper paper;

    @BeforeEach void setup() {
        use(sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60));
        when(users.findById(42L)).thenReturn(Optional.of(user(42, "student")));
        when(sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(50L, 42L, AttemptSessionStatus.in_progress))
                .thenReturn(Optional.empty());
        when(sessions.saveAndFlush(any())).thenAnswer(call -> identified(call.getArgument(0), 900));
    }

    private void use(Assignment value) {
        assignment = value;
        paper = paper(assignment, null);
        when(access.lockedStudentAssignment(50L, 42L)).thenReturn(assignment);
        when(papers.paperForNewSession(eq(assignment), any(), anyInt())).thenReturn(paper);
        when(papers.paperQuestions(70L)).thenReturn(List.of(mcq(assignment, 100), mcq(assignment, 101)));
        when(papers.sections(50L)).thenReturn(List.of());
    }

    @Test void createsSessionEndingAtTimeLimitWithStartedEventAndAudit() {
        var started = service.start(50L, 42L, accept);

        assertThat(started.created()).isTrue();
        AttemptSession saved = savedSession();
        assertThat(saved.getAttemptNo()).isEqualTo(1);
        assertThat(saved.getQuestionOrder()).containsExactly(500L, 501L);
        assertThat(Duration.between(saved.getStartedAt(), saved.getEndsAt())).isEqualTo(Duration.ofMinutes(60));
        verify(events).record(eq(saved), eq(SessionEventType.started), any(), isNull());
        verify(audit).record(eq(42L), eq("session.start"), eq("attempt_session"), eq(900L), isNull(), anyMap());
        verifyNoInteractions(eligibility);
    }

    @Test void endsAtIsCappedByClosesAtAndNoTimeLimitMeansClosesAt() {
        use(sessionAssignment(AssignmentCategory.MIDTERM, 60, 30));
        service.start(50L, 42L, accept);
        assertThat(savedSession().getEndsAt()).isEqualTo(assignment.getClosesAt());

        LocalDateTime now = UtcTime.now();
        var quiz = assignment(AssignmentCategory.QUIZ);
        quiz.configureDelivery(null, PaperMode.variants, 2, null);
        assertThat(AttemptSessionStartService.endsAt(quiz, now)).isEqualTo(quiz.getClosesAt());
        assertThat(AttemptSessionStartService.endsAt(assignment, now.minusHours(2))).isEqualTo(now.minusHours(1));
    }

    @Test void resumesInProgressSessionWithoutWindowChecks() {
        use(sessionAssignment(AssignmentCategory.MIDTERM, 60, 0));
        AttemptSession existing = session(assignment, paper, List.of(), UtcTime.now().plusMinutes(10));
        when(sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(50L, 42L, AttemptSessionStatus.in_progress))
                .thenReturn(Optional.of(existing));

        var started = service.start(50L, 42L, new StartSessionInput(null));

        assertThat(started.created()).isFalse();
        verify(events).record(eq(existing), eq(SessionEventType.resumed), any(), isNull());
        verify(sessions, never()).saveAndFlush(any());
        verify(papers, never()).paperForNewSession(any(), any(), anyInt());
    }

    @Test void rejectsAssignmentsThatAreNotSessionBased() {
        use(sessionAssignment(AssignmentCategory.ASSIGNMENT, null, 60));
        assertCode(() -> service.start(50L, 42L, accept), "CONFLICT");
    }

    @Test void rejectsBeforeAvailableFromAndInTheLastMinute() {
        assignment.updatePublishedSettings("Kỳ thi", null, UtcTime.now().plusMinutes(5), UtcTime.now().plusDays(1),
                false, null, 0, ReviewMode.after_close, true);
        assertCode(() -> service.start(50L, 42L, accept), "EXAM_NOT_OPEN");

        use(sessionAssignment(AssignmentCategory.MIDTERM, 60, 0));
        assignment.updatePublishedSettings("Kỳ thi", null, null, UtcTime.now().plusSeconds(50), false, null, 0,
                ReviewMode.after_close, true);
        assertCode(() -> service.start(50L, 42L, accept), "EXAM_NOT_OPEN");
    }

    @Test void windowIsCheckedBeforeAttemptsAndExamAllowsOneSession() {
        when(sessions.countByAssignment_IdAndStudent_Id(50L, 42L)).thenReturn(1L);
        assertCode(() -> service.start(50L, 42L, accept), "ATTEMPT_EXCEEDED");

        use(sessionAssignment(AssignmentCategory.MIDTERM, 60, 0));
        assertCode(() -> service.start(50L, 42L, accept), "EXAM_NOT_OPEN");
    }

    @Test void quizWithoutMaxAttemptsIsUnlimited() {
        use(sessionAssignment(AssignmentCategory.QUIZ, 15, 24 * 60));
        when(sessions.countByAssignment_IdAndStudent_Id(50L, 42L)).thenReturn(7L);

        assertThat(service.start(50L, 42L, accept).created()).isTrue();
        assertThat(savedSession().getAttemptNo()).isEqualTo(8);
    }

    @Test void finalExamRequiresEligibilityBeforeRulesCheck() {
        use(sessionAssignment(AssignmentCategory.FINAL, 90, 24 * 60));
        assignment.updateRulesText("Không dùng tài liệu");
        doThrow(new LmsException("NOT_ELIGIBLE", "x", org.springframework.http.HttpStatus.FORBIDDEN, null))
                .when(eligibility).requireEligible(assignment, 42L);
        assertCode(() -> service.start(50L, 42L, new StartSessionInput(false)), "NOT_ELIGIBLE");
    }

    @Test void rulesMustBeAcceptedWhenPresent() {
        assignment.updateRulesText("Không dùng tài liệu");
        assertCode(() -> service.start(50L, 42L, new StartSessionInput(null)), "VALIDATION_ERROR");

        service.start(50L, 42L, accept);
        assertThat(savedSession().getRulesAcceptedAt()).isNotNull();
    }

    @Test void uniqueViolationFromConcurrentStartReturnsTheExistingSession() {
        AttemptSession existing = session(assignment, paper, List.of(), UtcTime.now().plusMinutes(10));
        doThrow(new DataIntegrityViolationException("uq_attempt_session_no")).when(sessions).saveAndFlush(any());
        when(sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(50L, 42L, AttemptSessionStatus.in_progress))
                .thenReturn(Optional.empty(), Optional.of(existing));

        var started = service.start(50L, 42L, accept);

        assertThat(started.created()).isFalse();
        verify(events).record(eq(existing), eq(SessionEventType.resumed), any(), isNull());
    }

    private AttemptSession savedSession() {
        var captor = ArgumentCaptor.forClass(AttemptSession.class);
        verify(sessions, atLeastOnce()).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
        assertThatThrownBy(call).isInstanceOf(LmsException.class).extracting("code").isEqualTo(code);
    }
}
