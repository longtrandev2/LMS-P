package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.QuestionVersionRepository;

class AssignmentReadServiceTest {
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final QuestionVersionService snapshots = new QuestionVersionService(
            versions, mock(QuestionReadService.class), new ObjectMapper());
    private final AssignmentReadService reader = new AssignmentReadService(links, versions, snapshots,
            new AssignmentMapper(), new QuestionPaperMapper());

    @Test
    void publishedAssignmentUsesPinnedContentEvenWhenTheQuestionBankChanges() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        assignment.publish();
        var question = question(100, QuestionType.mcq);
        var link = link(assignment, question, "5.00", 1);
        link.pin(version(question, 1, mcqSnapshot("Nội dung đã ghim")));
        question.update("Nội dung đã sửa sau xuất bản", "Mới", question.getDifficulty(), question.getCategory());
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));

        var details = reader.studentDetails(assignment, 42L, 1);

        assertThat(details.questions()).singleElement().satisfies(view -> {
            assertThat(view.content()).isEqualTo("Nội dung đã ghim");
            assertThat(view.question_version_id()).isEqualTo(1001L);
            assertThat(view.options()).allSatisfy(option -> assertThat(option.is_correct()).isNull());
        });
        assertThat(details.assignment().total_points()).isEqualByComparingTo("5.00");
        verifyNoInteractions(versions);
    }

    @Test
    void draftUsesTheCurrentVersionBeforePublication() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        var question = question(100, QuestionType.mcq);
        var link = link(assignment, question, "3.00", 1);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L))
                .thenReturn(Optional.of(version(question, 2, mcqSnapshot("Bản mới nhất"))));

        var details = reader.details(assignment);

        assertThat(details.questions()).singleElement().satisfies(view -> {
            assertThat(view.content()).isEqualTo("Bản mới nhất");
            assertThat(view.question_version_id()).isEqualTo(1002L);
            assertThat(view.options().getFirst().is_correct()).isTrue();
        });
    }

    @Test
    void shuffledPaperIsStablePerSeedAndDiffersBetweenStudents() {
        var assignment = shuffledQuiz();
        List<AssignmentQuestion> questions = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            var question = question(100 + i, QuestionType.mcq);
            var link = link(assignment, question, "1.00", i + 1);
            link.pin(version(question, 1, mcqSnapshot("Câu " + i)));
            questions.add(link);
        }
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(questions);

        var first = order(reader.studentDetails(assignment, 42L, 1).questions());
        assertThat(order(reader.studentDetails(assignment, 42L, 1).questions())).isEqualTo(first);
        Set<List<Long>> seen = new HashSet<>();
        for (long student = 1; student <= 10; student++) seen.add(order(reader.studentDetails(assignment, student, 1).questions()));
        assertThat(seen).hasSizeGreaterThan(1);
        assertThat(reader.studentDetails(assignment, 42L, 1).questions())
                .extracting(AssignmentQuestionView::position).containsExactly(1, 2, 3, 4, 5, 6, 7, 8);
        assertThat(reader.details(assignment).questions()).extracting(AssignmentQuestionView::question_id)
                .containsExactly(100L, 101L, 102L, 103L, 104L, 105L, 106L, 107L);
    }

    private Assignment shuffledQuiz() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        assignment.configureReview(ReviewMode.after_submit, true, true, true);
        assignment.publish();
        return assignment;
    }

    private List<Long> order(List<AssignmentQuestionView> views) {
        return views.stream().map(AssignmentQuestionView::question_id).toList();
    }
}
