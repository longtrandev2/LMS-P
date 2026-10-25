package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;

class AssignmentMapperTest {
    private final AssignmentMapper mapper = new AssignmentMapper();

    @Test
    void studentMcqResponsePreservesOptionsAndHidesCorrectAnswers() {
        var assignment = assignment(AssignmentCategory.QUIZ);
        var link = link(assignment, question(100, QuestionType.mcq), "5.00", 1);

        var view = mapper.toQuestionView(link, 1001L, mcqSnapshot("Bản đã xuất bản"), false);

        assertThat(view.options()).hasSize(2).allSatisfy(option -> assertThat(option.is_correct()).isNull());
        assertThat(view.options()).extracting(option -> option.id()).containsExactly(11L, 12L);
        assertThat(view.content()).isEqualTo("Bản đã xuất bản");
    }

    @Test
    void studentProgrammingResponseExcludesHiddenTestsAndSampleSolution() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "5.00", 1);
        var view = mapper.toQuestionView(link, 1001L, programmingSnapshot(), false);

        assertThat(view.test_cases()).hasSize(1).allSatisfy(testCase -> assertThat(testCase.is_public()).isTrue());
        assertThat(view.starter_code()).isEqualTo("# starter");
        assertThat(new ObjectMapper().valueToTree(view).toString())
                .doesNotContain("private-input", "private-output", "private-sample-solution", "solution_code");
    }

    @Test
    void lecturerResponseIncludesCorrectAnswersAndAllTests() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "5.00", 1);

        assertThat(mapper.toQuestionView(link, 1001L, programmingSnapshot(), true).test_cases()).hasSize(2);
        assertThat(mapper.toQuestionView(link, 1001L, mcqSnapshot("Câu hỏi"), true).options())
                .extracting(option -> option.is_correct()).containsExactly(true, false);
    }
}
