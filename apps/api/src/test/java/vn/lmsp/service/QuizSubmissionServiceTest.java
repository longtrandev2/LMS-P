package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScorePolicy;
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
    private final List<Submission> savedAnswers = new ArrayList<>();
    private final User student = user(42, "student");
    private final Assignment assignment = assignment(AssignmentCategory.QUIZ);
    private final List<AssignmentQuestion> questions = new ArrayList<>();
    private AssignmentSubmissionService service;

    @BeforeEach
    void prepareQuizWithPinnedQuestions() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class),
                mock(QuestionReadService.class), new ObjectMapper());
        service = new AssignmentSubmissionService(access, links, attempts, submissions, users,
                snapshots, new SubmissionMapper(), mock(AuditService.class), new SubmissionPolicy());
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
        assertThat(result.question_scores()).hasSize(2);
        assertThat(result.question_scores().get(0).score()).isEqualByComparingTo("2.50");
        assertThat(result.question_scores().get(1).score()).isEqualByComparingTo("0");
        assertThat(result.question_scores().get(1).selected_option_ids()).isNull();
        assertThat(savedAnswers).hasSize(2);
    }

    @Test
    void latePenaltyRemainsAppliedToEveryAnswerAndTheQuizTotal() {
        assignment.update("Quiz", null, AssignmentCategory.QUIZ, LocalDateTime.now().minusDays(1),
                LocalDateTime.now().minusHours(1), true, LocalDateTime.now().plusHours(1), 20, 3, ScorePolicy.best);

        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.score()).isEqualByComparingTo("2.00");
        assertThat(result.is_late()).isTrue();
        assertThat(result.late_penalty_percent()).isEqualTo(20);
    }

    @Test
    void wrongAnswerReceivesZeroPoints() {
        assertThat(service.submitQuiz(50L, 42L, KEY, answer(12L)).score()).isEqualByComparingTo("0");
    }

    @Test
    void duplicateRequestReturnsTheStoredAttemptWithoutCreatingAnother() {
        var old = identified(new AssignmentAttempt(assignment, student, 1, false, 0, BigDecimal.ZERO,
                KEY, LocalDateTime.now()), 77);
        when(attempts.findByIdempotencyKey(KEY)).thenReturn(Optional.of(old));

        var result = service.submitQuiz(50L, 42L, KEY, answer(11L));

        assertThat(result.attempt_id()).isEqualTo(77L);
        verify(attempts, never()).saveAndFlush(any());
        verify(submissions, never()).save(any());
    }

    @Test
    void attemptLimitRejectsSubmissionBeforePersistingAnswers() {
        when(attempts.countByAssignment_IdAndStudent_Id(50L, 42L)).thenReturn(3L);

        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(11L)))
                .isInstanceOf(LmsException.class).hasMessageContaining("hết số lượt");
        verify(attempts, never()).saveAndFlush(any());
    }

    @Test
    void optionFromAnotherQuestionIsRejectedWithoutSavingTheAttempt() {
        assertThatThrownBy(() -> service.submitQuiz(50L, 42L, KEY, answer(999L)))
                .isInstanceOf(LmsException.class).hasMessageContaining("không thuộc câu hỏi");
        verify(attempts, never()).saveAndFlush(any());
    }

    private QuizSubmitInput answer(Long optionId) {
        return new QuizSubmitInput(List.of(new QuizAnswerInput(100L, List.of(optionId))));
    }
}
