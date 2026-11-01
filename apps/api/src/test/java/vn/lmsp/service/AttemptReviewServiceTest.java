package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.mapper.ReviewMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.support.AssessmentFixtures;

class AttemptReviewServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentAttemptRepository attempts = mock(AssignmentAttemptRepository.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final QuizAttemptService quizzes = mock(QuizAttemptService.class);
    private final AttemptSessionRepository sessions = mock(AttemptSessionRepository.class);
    private final Assignment assignment = assignment(AssignmentCategory.QUIZ);
    private final User student = user(42, "student");
    private AssignmentAttempt attempt;
    private AttemptReviewService service;

    @BeforeEach void setup() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        var reader = new AssignmentReadService(links, mock(QuestionVersionRepository.class), snapshots,
                new AssignmentMapper(), new QuestionPaperMapper());
        service = new AttemptReviewService(access, attempts, links, submissions, reader, quizzes, new ReviewPolicy(), new ReviewMapper(),
                sessions, new SessionPaperReader(links, snapshots, new QuestionPaperMapper()));
        var mcq = question(100, QuestionType.mcq);
        var mcqLink = link(assignment, mcq, "2.00", 1);
        mcqLink.pin(version(mcq, 1, mcqSnapshot("Câu 1")));
        var ordering = question(101, QuestionType.ordering);
        var orderingLink = link(assignment, ordering, "3.00", 2);
        orderingLink.pin(version(ordering, 1, AssessmentFixtures.ordering(ScoringMode.partial)));
        attempt = identified(new AssignmentAttempt(assignment, student, 1, false, 0, new BigDecimal("2.00"),
                "12345678-1234-1234-1234-123456789abc", UtcTime.now()), 77);
        var answer = new Submission(student, assignment, attempt, mcqLink,
                new AnswerResponse(List.of(11L), null, null, null, null, null), 1, new BigDecimal("2.00"), false, null, UtcTime.now());
        when(access.studentAssignment(50L, 42L, false)).thenReturn(assignment);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(assignment);
        when(attempts.findByIdAndAssignment_Id(77L, 50L)).thenReturn(Optional.of(attempt));
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(mcqLink, orderingLink));
        when(submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(77L)).thenReturn(List.of(answer));
        when(quizzes.attemptView(any(), any(), anyBoolean())).thenReturn(new QuizAttemptView(77L, 1, BigDecimal.TWO,
                new BigDecimal("5.00"), false, 0, attempt.getSubmittedAt(), false, null, null));
    }

    @Test void beforeTheQuizClosesTheStudentSeesNoQuestions() {
        var review = service.review(50L, 77L, 42L, true, false);
        assertThat(review.review_available()).isFalse();
        assertThat(review.questions()).isEmpty();
    }

    @Test void afterSubmitReviewShowsAnswersAndExplanationWhenAllowed() {
        assignment.configureReview(ReviewMode.after_submit, true, false, false);
        var review = service.review(50L, 77L, 42L, true, false);

        assertThat(review.shows_answers()).isTrue();
        assertThat(review.questions()).hasSize(2);
        var first = review.questions().getFirst();
        assertThat(first.response().selected_option_ids()).containsExactly(11L);
        assertThat(first.score()).isEqualByComparingTo("2.00");
        assertThat(first.correct_answer().option_ids()).containsExactly(11L);
        var second = review.questions().get(1);
        assertThat(second.score()).isEqualByComparingTo("0");
        assertThat(second.correct_answer().order()).containsExactly("ccccccc1", "ccccccc2", "ccccccc3", "ccccccc4");
        assertThat(second.explanation()).isEqualTo("Giải thích riêng");
        assertThat(second.question().ordering_items()).isNotNull();
    }

    @Test void reviewWithoutAnswersHidesCorrectAnswersAndExplanation() {
        assignment.configureReview(ReviewMode.after_submit, false, false, false);
        var review = service.review(50L, 77L, 42L, true, false);
        assertThat(review.shows_answers()).isFalse();
        assertThat(review.questions()).allSatisfy(question -> {
            assertThat(question.correct_answer()).isNull();
            assertThat(question.explanation()).isNull();
        });
        assertThat(new ObjectMapper().findAndRegisterModules().valueToTree(review).toString())
                .doesNotContain("is_correct", "answer_spec", "Giải thích riêng");
    }

    @Test void lecturerAlwaysSeesTheFullReviewAndOthersCannotOpenIt() {
        assignment.configureReview(ReviewMode.never, false, false, false);
        var review = service.review(50L, 77L, 7L, false, false);
        assertThat(review.shows_answers()).isTrue();
        assertThat(review.questions()).hasSize(2);
        when(access.studentAssignment(50L, 43L, false)).thenReturn(assignment);
        assertThatThrownBy(() -> service.review(50L, 77L, 43L, true, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("NOT_FOUND"));
    }

    @Test void sessionAttemptReviewFollowsQuestionOrderAndLinksCodeSubmissions() {
        var exam = assignment(AssignmentCategory.MIDTERM);
        exam.configureReview(ReviewMode.after_submit, true, true, true);
        var mcq = question(110, QuestionType.mcq);
        var mcqLink = identified(link(exam, mcq, "2.00", 1), 501);
        mcqLink.pin(version(mcq, 1, mcqSnapshot("Câu trắc nghiệm")));
        var code = question(111, QuestionType.programming);
        var codeLink = identified(link(exam, code, "8.00", 2), 502);
        codeLink.pin(version(code, 2, programmingSnapshot()));
        var unused = identified(link(exam, question(112, QuestionType.mcq), "2.00", 3), 503);
        var examAttempt = identified(new AssignmentAttempt(exam, student, 1, false, 0, new BigDecimal("8.00"),
                "12345678-1234-1234-1234-123456789abd", UtcTime.now()), 78);
        var paper = identified(new AssessmentPaper(exam, null, null, BigDecimal.TEN), 9);
        var session = identified(new AttemptSession(exam, student, 1, paper, List.of(502L, 501L),
                UtcTime.now().minusMinutes(30), UtcTime.now(), null), 5);
        session.markSubmitted(SubmitReason.timeout, UtcTime.now(), examAttempt);
        var codeAnswer = identified(Submission.programmingInAttempt(student, exam, examAttempt, codeLink, "python",
                "print(3)", UtcTime.now()), 900);
        codeAnswer.finish(SubmissionStatus.completed, GradingVerdict.AC);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(exam);
        when(attempts.findByIdAndAssignment_Id(78L, 50L)).thenReturn(Optional.of(examAttempt));
        when(sessions.findByAssignmentAttempt_Id(78L)).thenReturn(Optional.of(session));
        when(links.findAllById(List.of(502L, 501L))).thenReturn(List.of(mcqLink, codeLink));
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(mcqLink, codeLink, unused));
        when(submissions.findAllByAssignmentAttempt_IdOrderByQuestion_IdAsc(78L)).thenReturn(List.of(codeAnswer));

        var review = service.review(50L, 78L, 7L, false, false);

        assertThat(review.questions()).extracting(question -> question.question().question_id()).containsExactly(111L, 110L);
        assertThat(review.questions()).extracting(question -> question.question().position()).containsExactly(1, 2);
        var first = review.questions().getFirst();
        assertThat(first.submission_id()).isEqualTo(900L);
        assertThat(first.verdict()).isEqualTo(GradingVerdict.AC);
        assertThat(first.status()).isEqualTo(SubmissionStatus.completed);
        assertThat(first.score()).isEqualByComparingTo("8.00");
        var expected = new PaperShuffler(PaperShuffler.seed(50L, 42L, 1)).permute(List.of(11L, 12L), 110L * 4 + 1);
        assertThat(review.questions().get(1).question().options()).extracting(option -> option.id())
                .containsExactlyElementsOf(expected);
        assertThat(review.questions().get(1).submission_id()).isNull();
    }
}
