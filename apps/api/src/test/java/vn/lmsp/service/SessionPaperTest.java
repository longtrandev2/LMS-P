package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.SessionFixtures.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AssignmentSection;

class SessionPaperTest {
    private final Assignment assignment = assignment(AssignmentCategory.MIDTERM);
    private final AssignmentSection first = identified(new AssignmentSection(assignment, 0, "Phần I"), 1);
    private final AssignmentSection second = identified(new AssignmentSection(assignment, 1, "Phần II"), 2);

    private List<AssignmentQuestion> questions() {
        List<AssignmentQuestion> result = new ArrayList<>();
        for (long id = 100; id < 108; id++)
            result.add(pinned(assignment, id, mcqSnapshot("Câu " + id), "1", id < 104 ? first : second));
        return result;
    }

    @Test void shuffleStaysWithinSectionsAndIsDeterministic() {
        var questions = questions();
        var sections = List.of(first, second);
        var order = SessionPaper.order(questions, sections, true, PaperShuffler.of(50L, 42L, 1));

        assertThat(order).hasSize(8);
        assertThat(order.subList(0, 4)).containsExactlyInAnyOrder(500L, 501L, 502L, 503L);
        assertThat(order.subList(4, 8)).containsExactlyInAnyOrder(504L, 505L, 506L, 507L);
        assertThat(SessionPaper.order(questions, sections, true, PaperShuffler.of(50L, 42L, 1))).isEqualTo(order);
        List<Long> otherStudents = new ArrayList<>();
        for (long student = 43; student < 53; student++)
            otherStudents.addAll(SessionPaper.order(questions, sections, true, PaperShuffler.of(50L, student, 1)));
        assertThat(otherStudents).isNotEqualTo(java.util.Collections.nCopies(10, order).stream().flatMap(List::stream).toList());
    }

    @Test void withoutShuffleKeepsOriginalOrderAndSectionOrder() {
        var questions = new ArrayList<>(questions());
        java.util.Collections.reverse(questions);
        var order = SessionPaper.order(questions, List.of(first, second), false, PaperShuffler.of(50L, 42L, 1));
        assertThat(order).containsExactly(503L, 502L, 501L, 500L, 507L, 506L, 505L, 504L);
    }

    @Test void groupsUseSectionTitlesAndUnsectionedQuestionsFormAnUntitledPart() {
        var groups = SessionPaper.group(List.of(mcq(assignment, 1), mcq(assignment, 2)), List.of());
        assertThat(groups).singleElement().satisfies(group -> {
            assertThat(group.title()).isEmpty();
            assertThat(group.questions()).hasSize(2);
        });

        var sectioned = SessionPaper.group(questions(), List.of(first, second));
        assertThat(sectioned).extracting(SessionPaper.Group::title).containsExactly("Phần I", "Phần II");
    }
}
