package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.AssignmentInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScorePolicy;
import vn.lmsp.service.BlueprintValidator.Placement;

class BlueprintValidatorTest {
    private final BlueprintValidator validator = new BlueprintValidator();
    private final LocalDateTime due = LocalDateTime.of(2026, 11, 1, 10, 0);

    private AssignmentInput input(AssignmentCategory category, Integer limit, PaperMode mode, Integer variants) {
        return new AssignmentInput("Giữa kỳ", null, category, null, due, true, due.plusDays(1), 20, 3, ScorePolicy.best,
                null, null, null, null, null, limit, mode, variants, "  ", null, null);
    }

    private void rejects(Runnable call, String message) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(error.getMessage()).contains(message);
        });
    }

    @Test void examsAreForcedToOneAttemptNoLateAndLastScore() {
        var settings = validator.settings(input(AssignmentCategory.FINAL, 90, PaperMode.variants, 3));
        assertThat(settings.maxAttempts()).isEqualTo(1);
        assertThat(settings.allowLate()).isFalse();
        assertThat(settings.lateDueAt()).isNull();
        assertThat(settings.penalty()).isZero();
        assertThat(settings.policy()).isEqualTo(ScorePolicy.last);
        assertThat(settings.timeLimit()).isEqualTo(90);
        assertThat(settings.rulesText()).isNull();
    }

    @Test void examsNeedATimeLimit() {
        rejects(() -> validator.settings(input(AssignmentCategory.MIDTERM, null, null, null)), "thời lượng");
    }

    @Test void variantCountIsRequiredOnlyForVariants() {
        rejects(() -> validator.settings(input(AssignmentCategory.QUIZ, null, PaperMode.variants, null)), "số mã đề");
        rejects(() -> validator.settings(input(AssignmentCategory.QUIZ, null, PaperMode.same, 2)), "Chỉ đề nhiều mã");
        var quiz = validator.settings(input(AssignmentCategory.QUIZ, null, null, null));
        assertThat(quiz.mode()).isEqualTo(PaperMode.same);
        assertThat(quiz.maxAttempts()).isEqualTo(3);
        assertThat(quiz.allowLate()).isTrue();
    }

    @Test void ordinaryAssignmentsStayLegacy() {
        rejects(() -> validator.settings(input(AssignmentCategory.ASSIGNMENT, 30, null, null)), "không giới hạn thời gian");
        rejects(() -> validator.settings(input(AssignmentCategory.ASSIGNMENT, null, PaperMode.per_student, null)), "một đề chung");
        rejects(() -> validator.validateBlueprint(AssignmentCategory.ASSIGNMENT, PaperMode.same, null, 0, List.of(),
                List.of(new Placement(null, null, null))), "quy tắc bốc");
        rejects(() -> validator.validateBlueprint(AssignmentCategory.ASSIGNMENT, PaperMode.same, null, 2, List.of(), List.of()),
                "nhiều phần");
        validator.validateBlueprint(AssignmentCategory.ASSIGNMENT, PaperMode.same, null, 1, List.of(new Placement(0, null, null)), List.of());
    }

    @Test void quizRulesCannotDrawProgrammingQuestions() {
        rejects(() -> validator.validateBlueprint(AssignmentCategory.QUIZ, PaperMode.same, null, 0, List.of(),
                List.of(new Placement(null, null, QuestionType.programming))), "Quiz không được chứa câu lập trình");
        validator.validateBlueprint(AssignmentCategory.FINAL, PaperMode.same, null, 0, List.of(),
                List.of(new Placement(null, null, QuestionType.programming)));
    }

    @Test void sectionIndexAndVariantNumberMustFitTheBlueprint() {
        rejects(() -> validator.validateBlueprint(AssignmentCategory.MIDTERM, PaperMode.same, null, 2,
                List.of(new Placement(2, null, null)), List.of()), "Phần");
        rejects(() -> validator.validateBlueprint(AssignmentCategory.MIDTERM, PaperMode.same, null, 0,
                List.of(new Placement(null, 1, null)), List.of()), "Chỉ đề nhiều mã");
        rejects(() -> validator.validateBlueprint(AssignmentCategory.MIDTERM, PaperMode.variants, 2, 0, List.of(),
                List.of(new Placement(null, 3, null))), "Mã đề");
        validator.validateBlueprint(AssignmentCategory.MIDTERM, PaperMode.variants, 2, 2,
                List.of(new Placement(1, 2, null)), List.of(new Placement(0, null, QuestionType.mcq)));
    }
}
