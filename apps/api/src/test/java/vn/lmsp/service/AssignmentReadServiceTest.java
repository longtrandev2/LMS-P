package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.QuestionVersionRepository;

class AssignmentReadServiceTest {
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final QuestionVersionService snapshots = new QuestionVersionService(
            versions, mock(QuestionReadService.class), new ObjectMapper());
    private final AssignmentReadService reader = new AssignmentReadService(links, versions, snapshots, new AssignmentMapper());

    @Test
    void publishedAssignmentUsesPinnedContentEvenWhenTheQuestionBankChanges() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        assignment.publish();
        var question = question(100, QuestionType.mcq);
        var pinned = version(question, 1, mcqSnapshot("Nội dung đã ghim"));
        var link = link(assignment, question, "5.00", 1);
        link.pin(pinned);
        question.update("Nội dung đã sửa sau xuất bản", "Mới", question.getDifficulty(), question.getCategory());
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));

        var details = reader.details(assignment, false);

        assertThat(details.questions()).singleElement().satisfies(view -> {
            assertThat(view.content()).isEqualTo("Nội dung đã ghim");
            assertThat(view.question_version_id()).isEqualTo(1001L);
            assertThat(view.options()).allSatisfy(option -> assertThat(option.is_correct()).isNull());
        });
        assertThat(details.assignment().total_points()).isEqualByComparingTo("5.00");
        verify(links).findAllByAssignment_IdOrderByPositionAscIdAsc(50L);
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

        var details = reader.details(assignment, true);

        assertThat(details.questions()).singleElement().satisfies(view -> {
            assertThat(view.content()).isEqualTo("Bản mới nhất");
            assertThat(view.question_version_id()).isEqualTo(1002L);
            assertThat(view.options().getFirst().is_correct()).isTrue();
        });
    }
}
