package vn.lmsp.support;

import java.math.BigDecimal;
import java.util.List;
import vn.lmsp.dto.QuestionContentDtos.*;
import vn.lmsp.dto.QuestionDtos.OptionView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;

/** Snapshot mẫu cho từng loại câu khách quan — docs/assessment-spec.md §1.2. */
public final class AssessmentFixtures {
    private AssessmentFixtures() { }

    public static QuestionSnapshot snapshot(QuestionType type, ScoringMode mode, List<OptionView> options, AnswerSpec spec) {
        return new QuestionSnapshot(type, "Nội dung", null, QuestionDifficulty.medium, "Giải thích riêng", mode,
                options, spec, null, List.of());
    }

    /** Đúng: 11, 12; sai: 13, 14. */
    public static QuestionSnapshot multipleChoice(ScoringMode mode) {
        return snapshot(QuestionType.multiple_choice, mode, List.of(new OptionView(11L, "A", true, 0),
                new OptionView(12L, "B", true, 1), new OptionView(13L, "C", false, 2), new OptionView(14L, "D", false, 3)), null);
    }

    public static QuestionSnapshot shortAnswer() {
        return snapshot(QuestionType.short_answer, null, null, spec(List.of("TCP", "Transmission Control Protocol"),
                null, null, null, null, null, null));
    }

    public static QuestionSnapshot numeric() {
        return snapshot(QuestionType.numeric, null, null, spec(null, new BigDecimal("80"), new BigDecimal("0.5"),
                null, null, null, null));
    }

    public static QuestionSnapshot fillBlank(ScoringMode mode) {
        return snapshot(QuestionType.fill_blank, mode, null, spec(null, null, null,
                List.of(new BlankSpec(List.of("listen"), false), new BlankSpec(List.of("accept"), true)), null, null, null));
    }

    public static QuestionSnapshot matching(ScoringMode mode) {
        return snapshot(QuestionType.matching, mode, null, spec(null, null, null, null,
                List.of(new PairSpec("aaaaaaa1", "HTTP", "80", "bbbbbbb1"), new PairSpec("aaaaaaa2", "HTTPS", "443", "bbbbbbb2"),
                        new PairSpec("aaaaaaa3", "SSH", "22", "bbbbbbb3")),
                List.of(new ChoiceItem("ddddddd1", "8080")), null));
    }

    public static QuestionSnapshot ordering(ScoringMode mode) {
        return snapshot(QuestionType.ordering, mode, null, spec(null, null, null, null, null, null,
                List.of(new ChoiceItem("ccccccc1", "socket()"), new ChoiceItem("ccccccc2", "bind()"),
                        new ChoiceItem("ccccccc3", "listen()"), new ChoiceItem("ccccccc4", "accept()"))));
    }

    public static AnswerInput answer(Long questionId) {
        return new AnswerInput(questionId, null, null, null, null, null, null);
    }

    public static AnswerInput choose(Long questionId, Long... optionIds) {
        return new AnswerInput(questionId, List.of(optionIds), null, null, null, null, null);
    }

    private static AnswerSpec spec(List<String> accepted, BigDecimal value, BigDecimal tolerance, List<BlankSpec> blanks,
                                   List<PairSpec> pairs, List<ChoiceItem> distractors, List<ChoiceItem> items) {
        return new AnswerSpec(accepted, null, value, tolerance, blanks, pairs, distractors, items);
    }
}
