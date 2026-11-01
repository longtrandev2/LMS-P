package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.QuestionSubmissionInput;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.SubmissionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.support.AssessmentFixtures;

class AssignmentSubmissionServiceTest {
    private static final String KEY = "12345678-1234-1234-1234-123456789abc";
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Assignment assignment = assignment(AssignmentCategory.ASSIGNMENT);
    private final AssignmentQuestion link = link(assignment, question(100, QuestionType.short_answer), "4.00", 1);
    private AssignmentSubmissionService service;

    @BeforeEach void setup() {
        link.pin(version(link.getQuestion(), 1, AssessmentFixtures.shortAnswer()));
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        service = new AssignmentSubmissionService(access, links, submissions, users, snapshots, new SubmissionMapper(),
                new SubmissionPolicy(), new AnswerNormalizer(), new ObjectiveGrader(), new ReviewPolicy(),
                vn.lmsp.support.TestSettings.defaults());
        when(access.studentAssignment(50L, 42L, true)).thenReturn(assignment);
        when(links.findByAssignment_IdAndQuestion_Id(50L, 100L)).thenReturn(Optional.of(link));
        when(users.findById(42L)).thenReturn(Optional.of(user(42, "student")));
        when(submissions.save(any())).thenAnswer(call -> identified(call.getArgument(0), 90));
    }

    private QuestionSubmissionInput text(String value) {
        return new QuestionSubmissionInput(null, null, value, null, null, null, null, null, null);
    }

    @Test void scoreIsStoredButHiddenUntilReviewOpens() {
        var view = service.submitQuestion(50L, 100L, 42L, KEY, text("  tcp "));
        assertThat(view.score()).isNull();
        assertThat(view.response()).isNull();
        assertThat(view.review_available()).isFalse();
        verify(submissions).save(argThat(row -> row.getScore().compareTo(new java.math.BigDecimal("4.00")) == 0
                && "tcp".equals(row.getResponse().text())));
    }

    @Test void afterSubmitPolicyShowsTheScoreImmediately() {
        assignment.configureReview(ReviewMode.after_submit, true, false, false);
        var view = service.submitQuestion(50L, 100L, 42L, KEY, text("UDP"));
        assertThat(view.review_available()).isTrue();
        assertThat(view.score()).isEqualByComparingTo("0");
        assertThat(view.response().text()).isEqualTo("UDP");
    }

    @Test void wrongFieldTypeIsRejectedAndReplayWithDifferentContentConflicts() {
        assertThatThrownBy(() -> service.submitQuestion(50L, 100L, 42L, KEY, new QuestionSubmissionInput(List.of(11L))))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR"));
        var stored = identified(new Submission(user(42, "student"), assignment, null, link,
                new vn.lmsp.dto.QuestionContentDtos.AnswerResponse(null, "tcp", null, null, null, null), 1,
                java.math.BigDecimal.ONE, false, KEY, vn.lmsp.common.UtcTime.now()), 90);
        when(submissions.findByIdempotencyKey(KEY)).thenReturn(Optional.of(stored));
        assertThat(service.submitQuestion(50L, 100L, 42L, KEY, text("tcp")).id()).isEqualTo(90L);
        assertThatThrownBy(() -> service.submitQuestion(50L, 100L, 42L, KEY, text("udp")))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        verify(submissions, never()).save(any());
    }

    @Test void sessionBasedQuizRejectsPerQuestionSubmissions() {
        var timed = assignment(AssignmentCategory.QUIZ);
        timed.configureDelivery(30, PaperMode.same, null, null);
        when(access.studentAssignment(51L, 42L, true)).thenReturn(timed);
        assertThatThrownBy(() -> service.submitQuestion(51L, 100L, 42L, KEY, text("tcp")))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("CONFLICT"));
        verify(submissions, never()).save(any());
    }
}
