package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import vn.lmsp.service.BlueprintLoader.Blueprint;
import vn.lmsp.service.BlueprintValidator.Placement;

/**
 * Lưu cấu trúc đề của bản nháp (phần, câu cố định, quy tắc bốc) — docs/exam-spec.md §3.1–3.2, api-spec.md §7.
 * Mỗi lần lưu thay toàn bộ cấu trúc. `section_index` vắng = phần đầu (nếu có phần).
 */
@Service
@RequiredArgsConstructor
public class BlueprintService {
    private final AssignmentSectionRepository sections;
    private final AssignmentDrawRuleRepository rules;
    private final AssignmentQuestionRepository links;
    private final QuestionRepository questions;
    private final QuestionBankService banks;
    private final BlueprintValidator validator;
    private final BlueprintLoader loader;

    /** Request có gửi cấu trúc đề không (vắng cả ba trường = giữ nguyên khi PATCH). */
    public static boolean hasBlueprint(AssignmentInput input) {
        return input.questions() != null || input.sections() != null || input.draw_rules() != null;
    }

    public void replace(Assignment item, AssignmentInput input, Long actorId, boolean admin) {
        List<SectionInput> sectionRows = input.sections() == null ? List.of() : input.sections();
        List<QuestionSelectionInput> fixedRows = input.questions() == null ? List.of() : input.questions();
        List<DrawRuleInput> ruleRows = input.draw_rules() == null ? List.of() : input.draw_rules();
        validator.validateBlueprint(item.getCategory(), item.getPaperMode(), item.getVariantCount(), sectionRows.size(),
                fixedRows.stream().map(row -> new Placement(row.section_index(), row.variant_no(), null)).toList(),
                ruleRows.stream().map(row -> new Placement(row.section_index(), row.variant_no(), row.type())).toList());
        List<QuestionSelectionInput> ordered = orderedFixed(fixedRows);
        links.deleteBlueprintLinks(item.getId());
        rules.deleteByAssignmentId(item.getId());
        sections.deleteByAssignmentId(item.getId());
        List<AssignmentSection> saved = new ArrayList<>();
        for (int i = 0; i < sectionRows.size(); i++) {
            AssignmentSection section = new AssignmentSection(item, i + 1, sectionRows.get(i).title().trim());
            sections.save(section);
            saved.add(section);
        }
        for (int i = 0; i < ordered.size(); i++) {
            var row = ordered.get(i);
            Question question = questions.findByIdAndDeletedFalse(row.question_id())
                    .orElseThrow(() -> bad("Không tìm thấy câu hỏi trong ngân hàng"));
            banks.requireQuestionUsage(question, item.getLmsClass(), actorId, admin);
            requireAllowedType(item, question.getType());
            int position = row.position() == null ? fixedRows.indexOf(row) + 1 : row.position();
            links.save(new AssignmentQuestion(item, question, row.points(), position,
                    section(saved, row.section_index()), row.variant_no()));
        }
        for (int i = 0; i < ruleRows.size(); i++) {
            DrawRuleInput row = ruleRows.get(i);
            requireRuleBank(item, row, actorId, admin);
            rules.save(new AssignmentDrawRule(item, section(saved, row.section_index()), row.variant_no(), i + 1,
                    row.bank_id(), row.category_id(), row.difficulty(), row.type(), row.count(), row.points()));
        }
    }

    /** PATCH không gửi cấu trúc đề: cấu trúc đã lưu vẫn phải hợp lệ với hạng mục / cách giao đề mới. */
    public void validateExisting(Assignment item) {
        Blueprint blueprint = loader.load(item.getId());
        validator.validateBlueprint(item.getCategory(), item.getPaperMode(), item.getVariantCount(), blueprint.sections().size(),
                blueprint.fixed().stream().map(link -> new Placement(blueprint.sectionIndexOrNull(link.getSection()),
                        link.getVariantNo(), null)).toList(),
                blueprint.rules().stream().map(rule -> new Placement(blueprint.sectionIndexOrNull(rule.getSection()),
                        rule.getVariantNo(), rule.getType())).toList());
        blueprint.fixed().forEach(link -> requireAllowedType(item, link.getQuestion().getType()));
    }

    private List<QuestionSelectionInput> orderedFixed(List<QuestionSelectionInput> input) {
        Set<Long> ids = new HashSet<>(); Set<Integer> positions = new HashSet<>();
        for (int i = 0; i < input.size(); i++) {
            var row = input.get(i); int position = row.position() == null ? i + 1 : row.position();
            if (!ids.add(row.question_id())) throw bad("Không thể thêm cùng một câu hỏi nhiều lần");
            if (position < 1 || !positions.add(position)) throw bad("Thứ tự câu hỏi phải là số dương và không trùng");
        }
        var rows = new ArrayList<>(input);
        rows.sort(Comparator.comparing(row -> row.position() == null ? input.indexOf(row) + 1 : row.position()));
        return rows;
    }

    private void requireRuleBank(Assignment item, DrawRuleInput row, Long actorId, boolean admin) {
        QuestionBank bank = banks.requireBank(row.bank_id(), actorId, admin);
        Long course = item.getLmsClass().getCourseId();
        boolean usable = bank.getCourseId() == null ? bank.getOwnerId().equals(actorId) : bank.getCourseId().equals(course);
        if (!usable) throw new LmsException("FORBIDDEN", "Ngân hàng không thuộc học phần của lớp hoặc ngân hàng cá nhân của bạn",
                HttpStatus.FORBIDDEN, null);
        if (row.category_id() != null && !banks.requireCategory(row.category_id(), actorId, admin).getBankId().equals(row.bank_id()))
            throw bad("Danh mục không thuộc ngân hàng đã chọn");
    }

    private void requireAllowedType(Assignment item, QuestionType type) {
        if (item.getCategory() == AssignmentCategory.QUIZ && type == QuestionType.programming)
            throw bad("Quiz không được chứa câu lập trình");
    }

    private AssignmentSection section(List<AssignmentSection> saved, Integer index) {
        if (saved.isEmpty()) return null;
        return saved.get(index == null ? 0 : index);
    }

    private static LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
