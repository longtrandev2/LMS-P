package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.programmingSnapshot;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.TestCaseView;

class ProgrammingProblemValidatorTest {
    private final ProgrammingProblemValidator validator = new ProgrammingProblemValidator();

    @Test void acceptsPinnedProblemWithSupportedLanguagesAndTests() {
        assertThatCode(() -> validator.validateProblem(programmingSnapshot())).doesNotThrowAnyException();
    }

    @Test void rejectsTestPayloadsThatExceedSandboxLimits() {
        var snapshot = programmingSnapshot();
        var bigInput = new TestCaseView("x".repeat(128 * 1024 + 1), "ok", true, null, 1);
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, List.of(bigInput))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("128 KiB");
        var bigExpected = new TestCaseView("1", "y".repeat(64 * 1024 + 1), true, null, 1);
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, List.of(bigExpected))))
                .hasMessageContaining("64 KiB");
        var heavy = IntStream.rangeClosed(1, 20)
                .mapToObj(position -> new TestCaseView("x".repeat(120_000), "", false, null, position)).toList();
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, heavy))).hasMessageContaining("2 MiB");
        var many = IntStream.rangeClosed(1, 101).mapToObj(position -> new TestCaseView("1", "1", false, null, position)).toList();
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, many))).hasMessageContaining("1 đến 100");
        assertThatThrownBy(() -> validator.validateProblem(withTests(snapshot, List.of()))).hasMessageContaining("1 đến 100");
    }

    @Test void rejectsLimitsAndCheckerOutsideTheNewRanges() {
        assertThatThrownBy(() -> validator.validateProblem(withProgramming(new ProgrammingView(null, null, null, null,
                List.of("python"), 20_000, 256, "token", null)))).hasMessageContaining("100 đến 10000");
        assertThatThrownBy(() -> validator.validateProblem(withProgramming(new ProgrammingView(null, null, null, null,
                List.of("python"), 1000, 2048, "token", null)))).hasMessageContaining("32 đến 1024");
        assertThatThrownBy(() -> validator.validateProblem(withProgramming(new ProgrammingView(null, null, null, null,
                List.of(), 1000, 256, "token", null)))).hasMessageContaining("ngôn ngữ");
        assertThatThrownBy(() -> validator.validateProblem(withProgramming(new ProgrammingView(null, null, null, null,
                List.of("python"), 1000, 256, "regex", null)))).hasMessageContaining("token, line hoặc float");
        assertThatCode(() -> validator.validateProblem(withProgramming(new ProgrammingView("# legacy", null, null, null,
                List.of("python"), 1000, 256, null, null)))).doesNotThrowAnyException();
    }

    private QuestionSnapshot withTests(QuestionSnapshot source, List<TestCaseView> tests) {
        return new QuestionSnapshot(source.type(), source.content(), source.topic(), source.difficulty(),
                source.explanation(), source.scoring_mode(), source.options(), source.answer_spec(),
                source.programming(), tests);
    }

    private QuestionSnapshot withProgramming(ProgrammingView programming) {
        var source = programmingSnapshot();
        return new QuestionSnapshot(source.type(), source.content(), source.topic(), source.difficulty(),
                null, null, source.options(), null, programming, source.test_cases());
    }
}
