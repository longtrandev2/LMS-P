package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.MonitorStatus;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class SessionMonitorServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final SessionAnswerRepository answers = mock(SessionAnswerRepository.class);
    private final AssessmentPaperRepository papers = mock(AssessmentPaperRepository.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final PaperProvider paperProvider = mock(PaperProvider.class);
    private final Assignment exam = assignment(AssignmentCategory.MIDTERM);
    private final User online = user(41, "student"), offline = user(42, "student"), done = user(43, "student");
    private final User idle = user(44, "student"), dropped = user(45, "student");
    private final AssessmentPaper paper = identified(new AssessmentPaper(exam, "101", null, new BigDecimal("10.00")), 9);
    private SessionMonitorService service;

    @BeforeEach void setup() {
        service = new SessionMonitorService(access, enrollments, users, sessions, answers, papers, attempts, submissions, paperProvider);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(exam);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active)).thenReturn(
                List.of(online, offline, done, idle).stream().map(s -> new Enrollment(clazz(null), s, EnrollmentVia.lecturer)).toList());
        when(users.findAllById(any())).thenReturn(List.of(online, offline, done, idle, dropped));
        when(papers.findAllById(any())).thenReturn(List.of(paper));
        when(paperProvider.maxScore(exam)).thenReturn(new BigDecimal("10.00"));
    }

    private AttemptSession session(long id, User student, int attemptNo, int secondsSinceSeen) {
        var now = UtcTime.now();
        var session = identified(new AttemptSession(exam, student, attemptNo, paper, List.of(1L, 2L, 3L),
                now.minusMinutes(10), now.plusMinutes(20), null), id);
        ReflectionTestUtils.setField(session, "lastSeenAt", now.minusSeconds(secondsSinceSeen));
        return session;
    }

    @Test void buildsOneRowPerStudentFromLatestSessionWithBatchedCounts() {
        var live = session(1, online, 1, 5);
        var lost = session(2, offline, 1, 60);
        lost.focusLost();
        var finished = session(3, done, 1, 600);
        var attempt = identified(new AssignmentAttempt(exam, done, 1, false, 0, new BigDecimal("6.50"), "k", UtcTime.now()), 70);
        finished.markSubmitted(SubmitReason.timeout, UtcTime.now(), attempt);
        var droppedSession = session(4, dropped, 1, 5);
        droppedSession.markSubmitted(SubmitReason.manual, UtcTime.now(), null);
        when(sessions.findAllByAssignment_IdOrderByStudent_IdAscAttemptNoDesc(50L)).thenReturn(List.of(live, lost, finished, droppedSession));
        when(answers.countAnsweredBySession(any())).thenReturn(List.<Object[]>of(new Object[]{1L, 2L}, new Object[]{3L, 3L}));
        when(attempts.findAllByAssignment_IdOrderByAttemptNoAsc(50L)).thenReturn(List.of(attempt));
        when(submissions.findAttemptIdsWithStatus(eq(50L), any())).thenReturn(List.of(70L));

        var table = service.monitor(50L, 7L, false);

        assertThat(table.items()).extracting(row -> row.student_id()).containsExactly(41L, 42L, 43L, 44L, 45L);
        var first = table.items().getFirst();
        assertThat(first.status()).isEqualTo(MonitorStatus.in_progress);
        assertThat(first.online()).isTrue();
        assertThat(first.answered_count()).isEqualTo(2);
        assertThat(first.question_count()).isEqualTo(3);
        assertThat(first.paper_code()).isEqualTo("101");
        assertThat(first.remaining_seconds()).isBetween(1100L, 1200L);
        assertThat(first.max_score()).isEqualByComparingTo("10");
        var second = table.items().get(1);
        assertThat(second.online()).isFalse();
        assertThat(second.focus_lost_count()).isEqualTo(1);
        var third = table.items().get(2);
        assertThat(third.status()).isEqualTo(MonitorStatus.submitted);
        assertThat(third.remaining_seconds()).isNull();
        assertThat(third.score()).isEqualByComparingTo("6.50");
        assertThat(third.grading_pending()).isTrue();
        assertThat(third.submit_reason()).isEqualTo(SubmitReason.timeout);
        var fourth = table.items().get(3);
        assertThat(fourth.status()).isEqualTo(MonitorStatus.not_started);
        assertThat(fourth.session_id()).isNull();
        assertThat(fourth.max_score()).isEqualByComparingTo("10");
        assertThat(table.summary()).satisfies(summary -> {
            assertThat(summary.total()).isEqualTo(5);
            assertThat(summary.not_started()).isEqualTo(1);
            assertThat(summary.in_progress()).isEqualTo(2);
            assertThat(summary.submitted()).isEqualTo(2);
            assertThat(summary.offline()).isEqualTo(1);
        });
        verify(answers, times(1)).countAnsweredBySession(any());
        verify(users, times(1)).findAllById(any());
        verify(papers, times(1)).findAllById(any());
    }

    @Test void onlyTheLatestAttemptOfAMultiAttemptQuizIsShown() {
        var quiz = assignment(AssignmentCategory.QUIZ);
        quiz.configureDelivery(15, PaperMode.same, null, null);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(quiz);
        var newer = session(2, online, 2, 5);
        var older = session(1, online, 1, 5);
        when(sessions.findAllByAssignment_IdOrderByStudent_IdAscAttemptNoDesc(50L)).thenReturn(List.of(newer, older));

        var rows = service.monitor(50L, 7L, false).items();

        assertThat(rows.getFirst().session_id()).isEqualTo(2L);
        assertThat(rows.getFirst().attempt_no()).isEqualTo(2);
    }

    @Test void rejectsAssignmentsThatAreNotSessionBased() {
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(assignment(AssignmentCategory.ASSIGNMENT));
        assertThatThrownBy(() -> service.monitor(50L, 7L, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
    }
}
