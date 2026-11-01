package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.mapper.ReviewMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.support.AssessmentFixtures;

class SubmissionReadServiceTest {
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final Assignment assignment = assignment(AssignmentCategory.ASSIGNMENT);
    private SubmissionReadService service;

    @BeforeEach void setup() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        service = new SubmissionReadService(submissions, mock(GradingResultRepository.class), mock(TestResultRepository.class),
                access, snapshots, new ReviewPolicy(), new GradingMapper(), new ReviewMapper());
        var link = link(assignment, question(100, QuestionType.short_answer), "4", 1);
        link.pin(version(link.getQuestion(), 1, AssessmentFixtures.shortAnswer()));
        var row = identified(new Submission(user(42, "student"), assignment, null, link,
                new AnswerResponse(null, "tcp", null, null, null, null), 1, new BigDecimal("4.00"), false, "k", UtcTime.now()), 90);
        when(submissions.findById(90L)).thenReturn(Optional.of(row));
        when(access.studentAssignment(50L, 42L, false)).thenReturn(assignment);
        when(access.lecturerAssignment(50L, 7L, false, false)).thenReturn(assignment);
    }

    @Test void studentSeesNeitherScoreNorAnswerBeforeReview() {
        var details = service.get(90L, 42L, false, false);
        assertThat(details.review_available()).isFalse();
        assertThat(details.score()).isNull();
        assertThat(details.response()).isNull();
        assertThat(details.correct_answer()).isNull();
        assertThat(details.explanation()).isNull();
    }

    @Test void reviewWithAnswersAddsCorrectAnswerAndExplanation() {
        assignment.configureReview(ReviewMode.after_submit, true, false, false);
        var details = service.get(90L, 42L, false, false);
        assertThat(details.score()).isEqualByComparingTo("4.00");
        assertThat(details.correct_answer().accepted()).contains("TCP");
        assertThat(details.correct_answer().case_sensitive()).isFalse();
        assertThat(details.explanation()).isEqualTo("Giải thích riêng");

        assignment.configureReview(ReviewMode.after_submit, false, false, false);
        assertThat(service.get(90L, 42L, false, false).correct_answer()).isNull();
    }

    @Test void lecturerAlwaysSeesEverything() {
        var details = service.get(90L, 7L, true, false);
        assertThat(details.score()).isEqualByComparingTo("4.00");
        assertThat(details.correct_answer()).isNotNull();
    }
}
