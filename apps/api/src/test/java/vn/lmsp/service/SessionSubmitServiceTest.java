package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.identified;
import static vn.lmsp.support.SessionFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class SessionSubmitServiceTest {
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final SessionAnswerRepository answers = mock(SessionAnswerRepository.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final GradingJobRepository jobs = mock(GradingJobRepository.class);
    private final SessionPaper paper = mock(SessionPaper.class);
    private final SessionEventService events = mock(SessionEventService.class);
    private final AuditService audit = mock(AuditService.class);
    private final List<Submission> saved = new ArrayList<>();
    private SessionSubmitService service;
    private AttemptSession session;

    private void prepare(AssignmentCategory category) {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        service = new SessionSubmitService(sessions, answers, attempts, submissions, jobs, paper, snapshots,
                new ObjectiveGrader(), events, audit);
        var assignment = sessionAssignment(category, 60, 24 * 60);
        var right = mcq(assignment, 100);
        var blank = mcq(assignment, 101);
        var program = code(assignment, 102);
        var emptyProgram = code(assignment, 103);
        var links = List.of(right, blank, program, emptyProgram);
        session = session(assignment, paper(assignment, "101"), links, UtcTime.now().plusMinutes(10));
        var correct = new SessionAnswer(session, right);
        correct.saveAnswer(new AnswerResponse(List.of(11L), null, null, null, null, null), UtcTime.now());
        var source = new SessionAnswer(session, program);
        source.saveCode("python", "print(3)", UtcTime.now());
        var empty = new SessionAnswer(session, emptyProgram);
        empty.saveCode("python", "   ", UtcTime.now());
        when(answers.findAllBySession_Id(900L)).thenReturn(List.of(correct, source, empty));
        when(paper.questions(session)).thenReturn(links);
        when(sessions.findById(900L)).thenReturn(Optional.of(session));
        doAnswer(call -> identified(call.getArgument(0), 77)).when(attempts).saveAndFlush(any());
        doAnswer(call -> record(call.getArgument(0))).when(submissions).save(any());
        doAnswer(call -> record(call.getArgument(0))).when(submissions).saveAndFlush(any());
    }

    private Submission record(Submission submission) {
        saved.add(identified(submission, saved.size() + 1));
        return submission;
    }

    @BeforeEach void setup() { prepare(AssignmentCategory.MIDTERM); }

    @Test void claimerGradesObjectiveQuestionsAndQueuesNonEmptyCodeWithExamPriority() {
        when(sessions.claimSubmit(eq(900L), eq(SubmitReason.timeout), any())).thenReturn(1);

        var result = service.submit(900L, SubmitReason.timeout, null);

        assertThat(result.getStatus()).isEqualTo(AttemptSessionStatus.submitted);
        assertThat(result.getSubmitReason()).isEqualTo(SubmitReason.timeout);
        assertThat(result.getAssignmentAttempt().getId()).isEqualTo(77L);
        AssignmentAttempt attempt = result.getAssignmentAttempt();
        assertThat(attempt.getAttemptNo()).isEqualTo(1);
        assertThat(attempt.isLate()).isFalse();
        assertThat(attempt.getScore()).isEqualByComparingTo("2");
        assertThat(saved).hasSize(3);
        assertThat(saved).filteredOn(s -> s.getType() == SubmissionType.mcq).extracting(Submission::getScore)
                .usingElementComparator(java.math.BigDecimal::compareTo)
                .containsExactly(new java.math.BigDecimal("2"), java.math.BigDecimal.ZERO);
        Submission code = saved.stream().filter(s -> s.getType() == SubmissionType.code).findFirst().orElseThrow();
        assertThat(code.getAssignmentAttemptId()).isEqualTo(77L);
        assertThat(code.getSourceCode()).isEqualTo("print(3)");
        var job = ArgumentCaptor.forClass(GradingJob.class);
        verify(jobs).save(job.capture());
        assertThat(job.getValue().getPriority()).isEqualTo(10);
        assertThat(job.getValue().getSubmission()).isSameAs(code);
        verify(events).record(eq(session), eq(SessionEventType.auto_submitted), any(), isNull());
        verify(audit).record(isNull(), eq("session.submit"), eq("attempt_session"), eq(900L), isNull(), anyMap());
    }

    @Test void timedQuizCodeUsesDefaultPriorityAndManualEvent() {
        prepare(AssignmentCategory.QUIZ);
        when(sessions.claimSubmit(eq(900L), eq(SubmitReason.manual), any())).thenReturn(1);
        service.submit(900L, SubmitReason.manual, 42L);
        verify(jobs).save(argThat(job -> job.getPriority() == 5));
        verify(events).record(eq(session), eq(SessionEventType.submitted), any(), isNull());
    }

    @Test void losingTheClaimDoesNothing() {
        when(sessions.claimSubmit(eq(900L), any(), any())).thenReturn(0);

        var result = service.submit(900L, SubmitReason.forced, 7L);

        assertThat(result).isSameAs(session);
        verifyNoInteractions(attempts, submissions, jobs, events, audit);
    }

    @Test void sweeperSkipsSessionsExtendedSinceTheyWereListed() {
        when(sessions.findForUpdate(900L)).thenReturn(Optional.of(session));
        LocalDateTime before = UtcTime.now();
        assertThat(service.submitIfDue(900L, before)).isFalse();
        verify(sessions, never()).claimSubmit(any(), any(), any());

        when(sessions.claimSubmit(eq(900L), eq(SubmitReason.timeout), any())).thenReturn(1);
        assertThat(service.submitIfDue(900L, before.plusMinutes(11))).isTrue();
        verify(sessions).claimSubmit(eq(900L), eq(SubmitReason.timeout), any());
    }
}
