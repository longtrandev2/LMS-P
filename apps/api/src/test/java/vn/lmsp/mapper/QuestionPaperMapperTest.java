package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.AssessmentFixtures.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.QuestionContentDtos.ChoiceItem;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.service.PaperShuffler;

class QuestionPaperMapperTest {
    private final QuestionPaperMapper mapper = new QuestionPaperMapper();
    private final ObjectMapper json = new ObjectMapper();

    private AssignmentQuestion link(QuestionType type) {
        return vn.lmsp.support.DomainFixtures.link(assignment(AssignmentCategory.ASSIGNMENT), question(100, type), "5.00", 1);
    }

    @Test
    void studentMcqHidesCorrectAnswersAndExplanation() {
        var view = mapper.student(link(QuestionType.mcq), 1001L, mcqSnapshot("Bản đã xuất bản"), 1, null, false);

        assertThat(view.options()).extracting(option -> option.id()).containsExactly(11L, 12L);
        assertThat(json.valueToTree(view).toString()).doesNotContain("is_correct", "explanation", "answer_spec");
    }

    @Test
    void studentProgrammingShowsSamplesAndStarterCodesButNoHiddenTestsOrSolution() {
        var view = mapper.student(link(QuestionType.programming), 1001L, programmingSnapshot(), 1, null, false);

        assertThat(view.programming().samples()).singleElement().satisfies(sample -> assertThat(sample.input()).isEqualTo("1 2"));
        assertThat(view.programming().starter_codes()).containsExactly(Map.entry("python", "# starter"));
        assertThat(view.programming().checker_mode()).isEqualTo("token");
        assertThat(json.valueToTree(view).toString())
                .doesNotContain("private-input", "private-output", "private-sample-solution", "solution_code", "test_cases");
    }

    @Test
    void starterCodesMapWinsOverLegacyStarterCode() {
        var source = programmingSnapshot();
        var programming = new ProgrammingView("# old", Map.of("python", "# py"), null, null, List.of("python", "c"),
                1000, 128, null, null);
        var snapshot = new QuestionSnapshot(source.type(), source.content(), null, source.difficulty(), null, null,
                List.of(), null, programming, source.test_cases());
        assertThat(mapper.student(link(QuestionType.programming), 1L, snapshot, 1, null, false).programming().starter_codes())
                .containsExactly(Map.entry("python", "# py"));
    }

    @Test
    void lecturerViewIncludesAnswersExplanationAndAllTests() {
        assertThat(mapper.lecturer(link(QuestionType.programming), 1001L, programmingSnapshot()).test_cases()).hasSize(2);
        var mcq = mapper.lecturer(link(QuestionType.mcq), 1001L, mcqSnapshot("Câu hỏi"));
        assertThat(mcq.options()).extracting(option -> option.is_correct()).containsExactly(true, false);
        assertThat(mcq.scoring_mode()).isEqualTo(ScoringMode.all_or_nothing);
        var matching = mapper.lecturer(link(QuestionType.matching), 1L, matching(ScoringMode.partial));
        assertThat(matching.answer_spec()).isNotNull();
        assertThat(matching.explanation()).isEqualTo("Giải thích riêng");
    }

    @Test
    void matchingAndOrderingAreAlwaysShuffledAwayFromTheCorrectOrderAndStableBySeed() {
        for (int student = 1; student <= 30; student++) {
            var shuffler = PaperShuffler.of(50L, (long) student, 1);
            var matching = mapper.student(link(QuestionType.matching), 1L, matching(ScoringMode.partial), 1, shuffler, false);
            var ordering = mapper.student(link(QuestionType.ordering), 1L, ordering(ScoringMode.partial), 1, shuffler, false);

            assertThat(matching.matching().lefts()).extracting(ChoiceItem::id).containsExactly("aaaaaaa1", "aaaaaaa2", "aaaaaaa3");
            assertThat(matching.matching().rights()).extracting(ChoiceItem::id)
                    .containsExactlyInAnyOrder("bbbbbbb1", "bbbbbbb2", "bbbbbbb3", "ddddddd1");
            assertThat(matching.matching().rights().subList(0, 3)).extracting(ChoiceItem::id)
                    .isNotEqualTo(List.of("bbbbbbb1", "bbbbbbb2", "bbbbbbb3"));
            assertThat(ordering.ordering_items()).extracting(ChoiceItem::id)
                    .isNotEqualTo(List.of("ccccccc1", "ccccccc2", "ccccccc3", "ccccccc4"));
            var again = mapper.student(link(QuestionType.ordering), 1L, ordering(ScoringMode.partial), 1,
                    PaperShuffler.of(50L, (long) student, 1), false);
            assertThat(again.ordering_items()).isEqualTo(ordering.ordering_items());
            assertThat(json.valueToTree(matching).toString()).doesNotContain("right_id", "answer_spec");
        }
    }
}
