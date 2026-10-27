package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class QuizSubmissionServiceTest {
    private static final String KEY = "12345678-1234-1234-1234-123456789abc";
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final SessionPaperReader sessionPapers = mock(SessionPaperReader.class);
    private final List<Submission> savedAnswers = new ArrayList<>();
    private final User student = user(42, "student");
    private final Assignment assignment = assignment(AssignmentCategory.QUIZ);
    private final List<AssignmentQuestion> questions = new ArrayList<>();
    private QuizAttemptService service;

    @BeforeEach
    void prepareQuizWithPinnedQuestions() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class),
                mock(QuestionReadService.class), new ObjectMapper());
        service = new QuizAttemptService(access, links, attempts, submissions, users, snapshots, new SubmissionMapper(),
                mock(AuditService.class), new SubmissionPolicy(), new AnswerNormalizer(), new ObjectiveGrader(), new ReviewPolicy(),
                sessions, sessionPapers);
        assignment.configureReview(ReviewMode.after_submit, true, false, false);
        for (int i = 0; i < 2; i++) {
            var question = question(100 + i, QuestionType.mcq);
            var link = link(assignment, question, i == 0 ? "2.50" : "4.00", i + 1);
            link.pin(version(question, 1, mcqSnapshot("Câu " + i)));
            questions.add(link);
        }
        when(access.studentAssignment(50L, 42L, true)).thenReturn(assignment);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(questions);
        when(users.findById(42L)).thenReturn(Optional.of(student));
        when(attempts.saveAndFlush(any())).thenAnswer(call -> identified(call.getArgument(0), 77));
        when(submissions.save(any())).thenAnswer(call -> {
            Submission submission = identified(call.getArgument(0), savedAnswers.size() + 1);
            savedAnswers.add(submission);
            return submission;
        });
        when(submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(77L)).thenReturn(savedAnswers);
    }

    @Test
    void quizScoresPinnedAnswersAndStoresUnansweredQuestionsAsZero() {
        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.score()).isEqualByComparingTo("2.50");
        assertThat(result.max_score()).isEqualByComparingTo("6.50");
        assertThat(result.review_available()).isTrue();
        assertThat(result.question_scores()).hasSize(2);
        assertThat(result.question_scores().get(0).score()).isEqualByComparingTo("2.50");
        assertThat(result.question_scores().get(1).score()).isEqualByComparingTo("0");
        assertThat(savedAnswers).hasSize(2);
        assertThat(savedAnswers.get(0).getResponse().selected_option_ids()).containsExactly(11L);
        assertThat(savedAnswers.get(1).getResponse()).isNull();
    }

    @Test
    void latePenaltyRemainsAppliedToEveryAnswerAndTheQuizTotal() {
        assignment.update("Quiz", null, AssignmentCategory.QUIZ, UtcTime.now().minusDays(1),
                UtcTime.now().minusHours(1), true, UtcTime.now().plusHours(1), 20, 3, ScorePolicy.best);

        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.score()).isEqualByComparingTo("2.00");
        assertThat(result.is_late()).isTrue();
        assertThat(result.late_penalty_percent()).isEqualTo(20);
    }

    @Test
    void scoresAreHiddenUntilTheReviewWindowOpens() {
        assignment.configureReview(ReviewMode.after_close, true, false, false);

        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.score()).isEqualByComparingTo("2.50");
        assertThat(result.review_available()).isFalse();
        assertThat(result.review_available_at()).isEqualTo(assignment.getDueAt());
        assertThat(result.question_scores()).isNull();
    }

    @Test
    void wrongAnswerReceivesZeroPoints() {
        assertThat(service.submitQuiz(50L, 42L, KEY, answer(12L)).score()).isEqualByComparingTo("0");
    }

    @Test
    void duplicateRequestReturnsTheStoredAttemptWithoutCreatingAnother() {
        var old = identified(new AssignmentAttempt(assignment, student, 1, false, 0, BigDecimal.ZERO,
                KEY, UtcTime.now()), 77);
        savedAnswers.add(new Submission(student, assignment, old, questions.get(0),
                new AnswerResponse(List.of(11L), null, null, null, null, null), 1, new BigDecimal("2.50"), false, null, UtcTime.now()));
        when(attempts.findByIdempotencyKey(KEY)).thenReturn(Optional.of(old));

        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.attempt_id()).isEqualTo(77L);
        verify(attempts, never()).saveAndFlush(any());
        verify(submissions, never()).save(any());
        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(12L)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("IDEMPOTENCY_CONFLICT"));
    }

    @Test
    void attemptLimitRejectsSubmissionBeforePersistingAnswers() {
        when(attempts.countByAssignment_IdAndStudent_Id(50L, 42L)).thenReturn(3L);

        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(11L)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("ATTEMPT_EXCEEDED"))
                .hasMessageContaining("hết số lượt");
        verify(attempts, never()).saveAndFlush(any());
    }

    @Test
    void submissionAfterTheDeadlineIsRejectedWithDeadlinePassed() {
        assignment.update("Quiz", null, AssignmentCategory.QUIZ, UtcTime.now().minusDays(2),
                UtcTime.now().minusHours(1), false, null, 0, 3, ScorePolicy.best);

        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(11L)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("DEADLINE_PASSED"));
    }

    @Test
    void optionFromAnotherQuestionIsRejectedWithoutSavingTheAttempt() {
        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(999L)))
                .isInstanceOf(LmsException.class).hasMessageContaining("không thuộc câu hỏi");
        verify(attempts, never()).saveAndFlush(any());
    }

    private QuizSubmitInput answer(Long optionId) {
        return new QuizSubmitInput(List.of(new AnswerInput(100L, List.of(optionId), null, null, null, null, null)));
    }

    @Test void sessionBasedAssignmentsCannotBeSubmittedAsWholeQuiz() {
        assignment.configureDelivery(20, PaperMode.same, null, null);
        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(11L)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        var exam = assignment(AssignmentCategory.FINAL);
        when(access.studentAssignment(51L, 42L, true)).thenReturn(exam);
        assertThatThrownBy(() -> service.submitQuiz(51L, 42L, KEY, answer(11L)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        verify(attempts, never()).saveAndFlush(any());
    }

    @Test void attemptViewOfASessionUsesOnlyThatSessionsQuestions() {
        assignment.configureDelivery(20, PaperMode.variants, 2, null);
        var attempt = identified(new AssignmentAttempt(assignment, student, 1, false, 0, new BigDecimal("4.00"), KEY,
                UtcTime.now()), 77);
        var paper = identified(new AssessmentPaper(assignment, "102", null, new BigDecimal("4.00")), 9);
        var session = identified(new AttemptSession(assignment, student, 1, paper, List.of(2L), UtcTime.now().minusMinutes(5),
                UtcTime.now().plusMinutes(15), null), 5);
        session.markSubmitted(SubmitReason.manual, UtcTime.now(), attempt);
        when(sessions.findByAssignmentAttempt_Id(77L)).thenReturn(Optional.of(session));
        when(sessionPapers.questions(session)).thenReturn(List.of(questions.get(1)));
        savedAnswers.add(new Submission(student, assignment, attempt, questions.get(1), null, 1, new BigDecimal("4.00"),
                false, null, UtcTime.now()));
        var view = service.attemptView(attempt, assignment, true);
        assertThat(view.session_id()).isEqualTo(5L);
        assertThat(view.paper_code()).isEqualTo("102");
        assertThat(view.submit_reason()).isEqualTo(SubmitReason.manual);
        assertThat(view.max_score()).isEqualByComparingTo("4.00");
        assertThat(view.question_scores()).extracting(score -> score.question_id()).containsExactly(101L);
    }

    @Test void historyStillWorksForExamsAndLegacyAttemptsHaveNoSessionFields() {
        var exam = assignment(AssignmentCategory.MIDTERM);
        when(access.studentAssignment(51L, 42L, false)).thenReturn(exam);
        assertThat(service.quizHistory(51L, 42L)).isEmpty();
        var legacy = service.submitQuiz(50L, 42L, KEY, answer(11L));
        assertThat(legacy.session_id()).isNull();
        assertThat(legacy.paper_code()).isNull();
        verifyNoInteractions(sessions);
    }
}
