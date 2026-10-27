package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ReviewMode;

class AssignmentMapperTest {
    private final AssignmentMapper mapper = new AssignmentMapper();

    @Test
    void summaryAndAuditExposeReviewAndShuffleSettings() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        assignment.configureReview(ReviewMode.never, false, true, true);
        var link = link(assignment, question(100, QuestionType.mcq), "5.00", 1);

        var summary = mapper.toSummary(assignment, List.of(link));

        assertThat(summary.review_mode()).isEqualTo(ReviewMode.never);
        assertThat(summary.review_shows_answers()).isFalse();
        assertThat(summary.shuffle_questions()).isTrue();
        assertThat(summary.shuffle_options()).isTrue();
        assertThat(summary.total_points()).isEqualByComparingTo("5.00");
        assertThat(mapper.toAuditValue(assignment)).containsEntry("review_mode", ReviewMode.never)
                .containsEntry("shuffle_questions", true);
    }

    @Test
    void newAssignmentsDefaultToReviewAfterCloseWithAnswers() {
        var summary = mapper.toSummary(assignment(AssignmentCategory.ASSIGNMENT), List.of());
        assertThat(summary.review_mode()).isEqualTo(ReviewMode.after_close);
        assertThat(summary.review_shows_answers()).isTrue();
        assertThat(summary.shuffle_questions()).isFalse();
    }
}
