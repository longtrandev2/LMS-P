package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class AssignmentResultServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final User student = user(42, "student");
    private final User absent = user(43, "student");
    private Assignment assignment;
    private AssignmentQuestion link;
    private AssignmentResultService service;

    @BeforeEach void setup() {
        service = new AssignmentResultService(access, links, attempts, submissions, enrollments);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active)).thenReturn(List.of(
                new Enrollment(clazz(null), student, EnrollmentVia.lecturer), new Enrollment(clazz(null), absent, EnrollmentVia.lecturer)));
    }

    private void codeAssignment(ScorePolicy policy) {
        assignment = assignment(AssignmentCategory.ASSIGNMENT);
        assignment.update("Bài", null, AssignmentCategory.ASSIGNMENT, null, assignment.getDueAt(), false, null, 0, null, policy);
        link = link(assignment, question(100, QuestionType.programming), "10", 1);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(assignment);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));
    }

    private Submission code(int attemptNo, SubmissionStatus status, GradingVerdict verdict) {
        var row = identified(Submission.programming(student, assignment, link, attemptNo, "python", "x", false, 0,
                null, LocalDateTime.now().plusMinutes(attemptNo)), 90 + attemptNo);
        if (status != SubmissionStatus.pending) row.finish(status, verdict);
        return row;
    }

    @Test void bestPolicyIgnoresFailedAndPendingButStillCountsThem() {
        codeAssignment(ScorePolicy.best);
        when(submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(50L)).thenReturn(List.of(
                code(3, SubmissionStatus.pending, null), code(2, SubmissionStatus.failed, GradingVerdict.SYSTEM_ERROR),
                code(1, SubmissionStatus.completed, GradingVerdict.AC)));

        var rows = service.results(50L, 7L, false).items();

        var mine = rows.getFirst();
        assertThat(mine.final_score()).isEqualByComparingTo("10.00");
        assertThat(mine.max_score()).isEqualByComparingTo("10");
        assertThat(mine.attempt_count()).isEqualTo(3);
        assertThat(mine.attempts()).isNull();
        assertThat(mine.questions().getFirst().last_status()).isEqualTo(SubmissionStatus.pending);
        assertThat(rows.get(1).final_score()).isNull();
        assertThat(rows.get(1).attempt_count()).isZero();
    }

    @Test void lastPolicyUsesTheLatestGradedSubmission() {
        codeAssignment(ScorePolicy.last);
        when(submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(50L)).thenReturn(List.of(
                code(2, SubmissionStatus.completed, GradingVerdict.WA), code(1, SubmissionStatus.completed, GradingVerdict.AC)));
        assertThat(service.results(50L, 7L, false).items().getFirst().final_score()).isEqualByComparingTo("0");
    }

    @Test void quizUsesTheBestAttemptScore() {
        assignment = assignment(AssignmentCategory.QUIZ);
        link = link(assignment, question(100, QuestionType.mcq), "5", 1);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(assignment);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));
        when(attempts.findAllByAssignment_IdOrderByAttemptNoAsc(50L)).thenReturn(List.of(
                identified(new AssignmentAttempt(assignment, student, 1, false, 0, new BigDecimal("4"), "k1", LocalDateTime.now()), 1),
                identified(new AssignmentAttempt(assignment, student, 2, false, 0, new BigDecimal("2"), "k2", LocalDateTime.now()), 2)));
        when(submissions.findAllByAssignment_IdOrderBySubmittedAtDesc(50L)).thenReturn(List.of());

        var mine = service.results(50L, 7L, false).items().getFirst();
        assertThat(mine.final_score()).isEqualByComparingTo("4");
        assertThat(mine.attempt_count()).isEqualTo(2);
        assertThat(mine.attempts()).extracting(attempt -> attempt.attempt_no()).containsExactly(1, 2);
    }
}
