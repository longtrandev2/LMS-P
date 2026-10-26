package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.programmingSnapshot;

import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.TestCaseView;

class ProgrammingProblemValidatorTest {
    private final ProgrammingProblemValidator validator = new ProgrammingProblemValidator();

    @Test void acceptsPinnedProblemWithSupportedLanguagesAndTests() {
        assertThatCode(() -> validator.validateProblem(programmingSnapshot())).doesNotThrowAnyException();
    }

    @Test void rejectsTestPayloadsThatExceedSandboxLimits() {
        var snapshot = programmingSnapshot();
        var tooLarge = new TestCaseView("x".repeat(128 * 1024 + 1), "ok", true, null, 1);
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, List.of(tooLarge))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("128 KiB");

        var tests = java.util.stream.IntStream.rangeClosed(1, 11)
                .mapToObj(position -> new TestCaseView("x".repeat(100_000), "", false, null, position)).toList();
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, tests)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("1 MiB");
    }

    private QuestionSnapshot withTests(QuestionSnapshot source, List<TestCaseView> tests) {
        return new QuestionSnapshot(source.type(), source.content(), source.topic(), source.difficulty(),
                source.options(), source.programming(), tests);
    }
}
