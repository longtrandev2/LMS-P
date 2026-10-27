package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionContentDtos.*;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;

class QuestionContentValidatorTest {
    private final QuestionContentValidator validator = new QuestionContentValidator(
            new AnswerSpecValidator(new AnswerIdGenerator()), new ProgrammingContentValidator());

    private QuestionContent choice(QuestionType type, ScoringMode mode, OptionInput... options) {
        return validator.validate(type, " Câu hỏi ", null, mode, List.of(options), null, null, null);
    }
    private QuestionContent spec(QuestionType type, String content, AnswerSpec spec) {
        return validator.validate(type, content, null, null, null, spec, null, null);
    }
    private static OptionInput opt(String content, boolean correct) { return new OptionInput(content, correct); }
    private static AnswerSpec pairs(List<PairSpec> pairs, List<ChoiceItem> distractors) {
        return new AnswerSpec(null, null, null, null, null, pairs, distractors, null);
    }
    private static void rejects(Runnable call, String message) {
        assertThatThrownBy(call::run).isInstanceOf(LmsException.class).hasMessageContaining(message);
    }

    @Test void mcqNeedsExactlyOneCorrectAndForcesAllOrNothing() {
        var content = choice(QuestionType.mcq, ScoringMode.partial, opt("A", true), opt("B", false));
        assertThat(content.content()).isEqualTo("Câu hỏi");
        assertThat(content.scoringMode()).isEqualTo(ScoringMode.all_or_nothing);
        rejects(() -> choice(QuestionType.mcq, null, opt("A", true), opt("B", true)), "đúng 1");
        rejects(() -> choice(QuestionType.mcq, null, opt("A", true)), "2 đến 8");
    }

    @Test void multipleChoiceAllowsSeveralCorrectAndKeepsPartial() {
        var content = choice(QuestionType.multiple_choice, ScoringMode.partial, opt("A", true), opt("B", true), opt("C", false));
        assertThat(content.scoringMode()).isEqualTo(ScoringMode.partial);
        assertThat(choice(QuestionType.multiple_choice, null, opt("A", true), opt("B", false)).scoringMode())
                .isEqualTo(ScoringMode.all_or_nothing);
        rejects(() -> choice(QuestionType.multiple_choice, null, opt("A", false), opt("B", false)), "ít nhất 1");
    }

    @Test void trueFalseAlwaysStoresDungSaiFromClientFlag() {
        var content = choice(QuestionType.true_false, null, opt("x", false), opt("y", true));
        assertThat(content.options()).containsExactly(opt("Đúng", false), opt("Sai", true));
        assertThat(choice(QuestionType.true_false, null, opt("Sai", true)).options().get(1).is_correct()).isTrue();
        rejects(() -> choice(QuestionType.true_false, null, opt("Đúng", false), opt("Sai", false)), "đúng 1");
    }

    @Test void shortAnswerAndNumericAreNormalized() {
        var shortAnswer = spec(QuestionType.short_answer, "Giao thức?",
                new AnswerSpec(List.of(" TCP ", "TCP"), null, BigDecimal.ONE, null, null, null, null, null));
        assertThat(shortAnswer.answerSpec()).isEqualTo(new AnswerSpec(List.of("TCP"), false, null, null, null, null, null, null));
        var numeric = spec(QuestionType.numeric, "Cổng?", new AnswerSpec(null, null, new BigDecimal("80"), null, null, null, null, null));
        assertThat(numeric.answerSpec().tolerance()).isEqualByComparingTo("0");
        rejects(() -> spec(QuestionType.numeric, "Cổng?", new AnswerSpec(null, null, null, null, null, null, null, null)), "value");
        rejects(() -> spec(QuestionType.short_answer, "?", null), "answer_spec");
    }

    @Test void fillBlankPlaceholdersMustMatchBlanks() {
        var blanks = List.of(new BlankSpec(List.of("listen"), null), new BlankSpec(List.of("accept"), true));
        var spec = new AnswerSpec(null, null, null, null, blanks, null, null, null);
        var ok = spec(QuestionType.fill_blank, "Gọi [[2]]() sau [[1]]()", spec);
        assertThat(ok.scoringMode()).isEqualTo(ScoringMode.partial);
        assertThat(ok.answerSpec().blanks().get(0).case_sensitive()).isFalse();
        rejects(() -> spec(QuestionType.fill_blank, "Chỉ có [[1]]", spec), "liên tục");
        rejects(() -> spec(QuestionType.fill_blank, "[[1]] [[3]]", spec), "liên tục");
        rejects(() -> spec(QuestionType.fill_blank, "[[1]] [[1]]", spec), "liên tục");
    }

    @Test void matchingGeneratesMissingIdsKeepsValidOnesAndRejectsDuplicateRights() {
        var result = spec(QuestionType.matching, "Ghép", pairs(List.of(new PairSpec("a1b2c3d4", "HTTP", "80", null),
                new PairSpec(null, "SSH", "22", "a1b2c3d4")), List.of(new ChoiceItem(null, "8080")))).answerSpec();
        assertThat(result.pairs().get(0).id()).isEqualTo("a1b2c3d4");
        var ids = List.of(result.pairs().get(0).right_id(), result.pairs().get(1).id(), result.pairs().get(1).right_id(),
                result.distractors().get(0).id());
        assertThat(ids).allMatch(id -> id.matches("[0-9a-f]{8}")).doesNotHaveDuplicates().doesNotContain("a1b2c3d4");
        rejects(() -> spec(QuestionType.matching, "Ghép", pairs(List.of(new PairSpec(null, "A", "1", null),
                new PairSpec(null, "B", "2", null)), List.of(new ChoiceItem(null, " 1 ")))), "không được trùng");
        rejects(() -> spec(QuestionType.matching, "Ghép", pairs(List.of(new PairSpec(null, "A", "1", null)), null)), "2–12");
    }

    @Test void orderingRequiresDistinctItems() {
        var items = List.of(new ChoiceItem(null, "socket()"), new ChoiceItem("11aa22bb", "bind()"));
        var result = spec(QuestionType.ordering, "Sắp xếp", new AnswerSpec(null, null, null, null, null, null, null, items));
        assertThat(result.answerSpec().items()).extracting(ChoiceItem::text).containsExactly("socket()", "bind()");
        assertThat(result.answerSpec().items().get(1).id()).isEqualTo("11aa22bb");
        rejects(() -> spec(QuestionType.ordering, "Sắp xếp", new AnswerSpec(null, null, null, null, null, null, null,
                List.of(new ChoiceItem(null, "a"), new ChoiceItem(null, "a")))), "không được trùng");
    }

    @Test void typesRejectFieldsOfOtherTypes() {
        rejects(() -> validator.validate(QuestionType.short_answer, "?", null, null, List.of(opt("A", true)),
                null, null, null), "lựa chọn");
        rejects(() -> validator.validate(QuestionType.mcq, "?", null, null, List.of(opt("A", true), opt("B", false)),
                new AnswerSpec(List.of("x"), null, null, null, null, null, null, null), null, null), "answer_spec");
        rejects(() -> validator.validate(QuestionType.mcq, "?", null, null, List.of(opt("A", true), opt("B", false)),
                null, program("python", null, null), null), "lập trình");
    }

    @Test void programmingChecksLanguagesSolutionAndTests() {
        var tests = List.of(new TestCaseInput("1 2", "3", null, new BigDecimal("50")));
        var content = validator.validate(QuestionType.programming, "Cộng", "Giải thích", ScoringMode.partial, null, null,
                program("python", "print(3)", "python"), tests);
        assertThat(content.scoringMode()).isEqualTo(ScoringMode.all_or_nothing);
        assertThat(content.programming().checker_mode()).isEqualTo("token");
        assertThat(content.programming().time_limit_ms()).isEqualTo(1000);
        assertThat(content.testCases().getFirst().is_public()).isFalse();
        assertThat(content.testCases().getFirst().weight()).isEqualByComparingTo("1");
        rejects(() -> validator.validate(QuestionType.programming, "Cộng", null, null, null, null,
                program("python", "int main(){}", null), tests), "ngôn ngữ của lời giải");
        rejects(() -> validator.validate(QuestionType.programming, "Cộng", null, null, null, null,
                program("python", "x", "cpp"), tests), "thuộc danh sách");
        rejects(() -> validator.validate(QuestionType.programming, "Cộng", null, null, null, null,
                program("python", null, null), List.of()), "1 đến 100");
        rejects(() -> validator.validate(QuestionType.programming, "Cộng", null, null, null, null,
                program("python", null, null), List.of(new TestCaseInput("x".repeat(128 * 1024 + 1), "", true, null))), "128 KiB");
        rejects(() -> validator.validate(QuestionType.programming, "Cộng", null, null, null, null,
                new ProgrammingInput(null, null, null, null, List.of(), null, null, null, null), tests), "ít nhất một ngôn ngữ");
    }

    @Test void floatCheckerGetsDefaultEpsilonAndStarterCodesKeepOnlyAllowedLanguages() {
        var input = new ProgrammingInput(null, Map.of("python", "import sys", "java", "class Main {}"), null, null,
                List.of("python"), 2000, 128, "float", null);
        var result = new ProgrammingContentValidator().validate(input);
        assertThat(result.checker_epsilon()).isEqualTo(1e-6);
        assertThat(result.starter_codes()).containsOnlyKeys("python");
    }

    private static ProgrammingInput program(String language, String solution, String solutionLanguage) {
        return new ProgrammingInput(null, null, solution, solutionLanguage, List.of(language), null, null, null, null);
    }
}
