package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class BlueprintServiceTest {
    private final AssignmentSectionRepository sections = mock(AssignmentSectionRepository.class);
    private final AssignmentDrawRuleRepository rules = mock(AssignmentDrawRuleRepository.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final QuestionBankService banks = mock(QuestionBankService.class);
    private final BlueprintService service = new BlueprintService(sections, rules, links, questions, banks,
            new BlueprintValidator(), new BlueprintLoader(sections, links, rules));
    private final User lecturer = user(7, "lecturer");
    private final QuestionBank personal = identified(new QuestionBank(null, lecturer, "Cá nhân", null, lecturer), 20);

    private AssignmentInput input(AssignmentCategory category, List<QuestionSelectionInput> fixed, List<DrawRuleInput> drawRules) {
        return new AssignmentInput("Đề", null, category, null, LocalDateTime.now().plusDays(1), false, null, 0, 1, null,
                fixed, null, null, null, null, 60, PaperMode.variants, 2, null,
                List.of(new SectionInput("Phần I"), new SectionInput("Phần II")), drawRules);
    }

    private Assignment exam() {
        Assignment exam = assignment(AssignmentCategory.FINAL);
        exam.configureDelivery(60, PaperMode.variants, 2, null);
        return exam;
    }

    @Test void blueprintIsReplacedWithSectionsFixedQuestionsAndRules() {
        var exam = exam();
        when(questions.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(question(100, QuestionType.programming)));
        when(banks.requireBank(20L, 7L, false)).thenReturn(personal);
        var body = input(AssignmentCategory.FINAL, List.of(new QuestionSelectionInput(100L, BigDecimal.TEN, 1, 1, 2)),
                List.of(new DrawRuleInput(null, null, 20L, null, null, QuestionType.mcq, 5, BigDecimal.ONE)));

        service.replace(exam, body, 7L, false);

        verify(links).deleteBlueprintLinks(50L);
        verify(rules).deleteByAssignmentId(50L);
        verify(sections).deleteByAssignmentId(50L);
        var savedSections = ArgumentCaptor.forClass(AssignmentSection.class);
        verify(sections, times(2)).save(savedSections.capture());
        var link = ArgumentCaptor.forClass(AssignmentQuestion.class);
        verify(links).save(link.capture());
        assertThat(link.getValue().getSection()).isSameAs(savedSections.getAllValues().get(1));
        assertThat(link.getValue().getVariantNo()).isEqualTo(2);
        var rule = ArgumentCaptor.forClass(AssignmentDrawRule.class);
        verify(rules).save(rule.capture());
        assertThat(rule.getValue().getSection()).isSameAs(savedSections.getAllValues().getFirst());
        assertThat(rule.getValue().getPosition()).isEqualTo(1);
    }

    @Test void ruleCategoryMustBelongToTheRuleBank() {
        when(banks.requireBank(20L, 7L, false)).thenReturn(personal);
        var otherBank = identified(new QuestionBank(null, lecturer, "Khác", null, lecturer), 21);
        when(banks.requireCategory(30L, 7L, false)).thenReturn(identified(new QuestionCategory(otherBank, "Socket", lecturer), 30));
        var body = input(AssignmentCategory.FINAL, List.of(), List.of(new DrawRuleInput(0, null, 20L, 30L, null, null, 2, BigDecimal.ONE)));

        assertThatThrownBy(() -> service.replace(exam(), body, 7L, false)).hasMessageContaining("Danh mục không thuộc ngân hàng");
    }

    @Test void ruleBankFromAnotherCourseIsForbidden() {
        var otherCourse = identified(new Course("CS999", "Khác", null, lecturer), 9);
        when(banks.requireBank(22L, 7L, false)).thenReturn(identified(new QuestionBank(otherCourse, lecturer, "B", null, lecturer), 22));
        var body = input(AssignmentCategory.FINAL, List.of(), List.of(new DrawRuleInput(0, null, 22L, null, null, null, 2, BigDecimal.ONE)));

        assertThatThrownBy(() -> service.replace(exam(), body, 7L, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test void existingBlueprintMustStillFitNewDeliverySettings() {
        var quiz = assignment(AssignmentCategory.QUIZ);
        var variantLink = new AssignmentQuestion(quiz, question(100, QuestionType.mcq), BigDecimal.ONE, 1, null, 2);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(variantLink));

        assertThatThrownBy(() -> service.validateExisting(quiz)).hasMessageContaining("Chỉ đề nhiều mã");
    }
}
