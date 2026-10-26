package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/** Nhập câu hỏi từ CSV đã đọc ở trình duyệt — api-spec.md §5 (mcq, multiple_choice, true_false, short_answer). */
@Service
@RequiredArgsConstructor
public class QuestionCsvService {
    private static final Set<QuestionType> CSV_TYPES = EnumSet.of(QuestionType.mcq, QuestionType.multiple_choice,
            QuestionType.true_false, QuestionType.short_answer);
    private final QuestionBankService banks;
    private final QuestionRepository questions;
    private final QuestionContentValidator validator;
    private final QuestionContentService contents;
    private final QuestionVersionService snapshots;
    private final UserRepository users;
    private final AuditService audit;

    private record Checked(int row, String content, QuestionType type, QuestionContent parsed, String error) { }

    @Transactional(readOnly = true)
    public QuestionCsvPreview preview(Long bankId, Long categoryId, QuestionCsvRequest request, Long actor, boolean admin) {
        requireTarget(bankId, categoryId, actor, admin);
        List<Checked> checked = check(bankId, request);
        List<QuestionCsvPreviewRow> rows = checked.stream().map(item -> new QuestionCsvPreviewRow(item.row(), item.content(),
                item.error() == null, item.error() == null ? null : "INVALID_ROW", item.error())).toList();
        return new QuestionCsvPreview((int) checked.stream().filter(item -> item.error() == null).count(), rows);
    }

    @Transactional
    public QuestionImportResult importRows(Long bankId, Long categoryId, QuestionCsvRequest request, Long actorId, boolean admin) {
        QuestionCategory category = requireTarget(bankId, categoryId, actorId, admin);
        User actor = users.findById(actorId).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null));
        List<QuestionImportError> errors = new ArrayList<>(); int created = 0;
        List<Checked> checked = check(bankId, request);
        for (int i = 0; i < checked.size(); i++) {
            Checked item = checked.get(i); QuestionCsvRow row = request.rows().get(i);
            if (item.error() != null) { errors.add(new QuestionImportError(item.row(), "INVALID_ROW", item.error())); continue; }
            Question question = questions.save(new Question(actor, category, item.type(), item.parsed().content(),
                    blankNull(row.topic()), difficulty(row.difficulty())));
            contents.apply(question, item.parsed()); questions.flush();
            snapshots.saveVersion(question, actor);
            audit.record(actorId, "question.create", "question", question.getId(), null,
                    Map.of("type", item.type().name(), "content", question.getContent(), "category_id", categoryId, "source", "csv"));
            created++;
        }
        return new QuestionImportResult(created, errors);
    }

    private List<Checked> check(Long bankId, QuestionCsvRequest request) {
        Set<String> seen = new HashSet<>();
        List<Checked> result = new ArrayList<>();
        for (int i = 0; i < request.rows().size(); i++) {
            QuestionCsvRow row = request.rows().get(i);
            int rowNo = row == null ? i + 2 : row.row();
            String content = row == null || row.content() == null ? "" : row.content();
            QuestionType type = null; QuestionContent parsed = null; String error = null;
            try {
                type = type(row == null ? null : row.type());
                parsed = parse(type, row);
                if (!seen.add(normalize(parsed.content()))
                        || questions.existsByCategory_Bank_IdAndContentIgnoreCaseAndDeletedFalse(bankId, parsed.content()))
                    error = "Câu hỏi đã tồn tại trong ngân hàng";
            } catch (LmsException failure) {
                error = failure.getMessage();
            }
            result.add(new Checked(rowNo, content, type, parsed, error));
        }
        return result;
    }

    private QuestionContent parse(QuestionType type, QuestionCsvRow row) {
        if (row == null || row.content() == null || row.content().isBlank()) throw invalid("Thiếu nội dung câu hỏi");
        if (row.difficulty() != null && !row.difficulty().isBlank() && parseDifficulty(row.difficulty()) == null)
            throw invalid("Độ khó chỉ nhận easy, medium hoặc hard");
        String answer = row.correct_option() == null ? "" : row.correct_option().trim();
        if (answer.isEmpty()) throw invalid("Thiếu đáp án đúng");
        List<OptionInput> options = null; AnswerSpec spec = null;
        switch (type) {
            case mcq, multiple_choice -> options = choiceOptions(row.options(), answer);
            case true_false -> {
                String letter = answer.toUpperCase(Locale.ROOT);
                if (!letter.equals("A") && !letter.equals("B")) throw invalid("Câu đúng/sai: đáp án là A (Đúng) hoặc B (Sai)");
                options = List.of(new OptionInput(QuestionContentValidator.TRUE_LABEL, letter.equals("A")),
                        new OptionInput(QuestionContentValidator.FALSE_LABEL, letter.equals("B")));
            }
            default -> spec = new AnswerSpec(Arrays.stream(answer.split("\\|")).map(String::trim).toList(), false,
                    null, null, null, null, null, null);
        }
        return validator.validate(type, row.content(), row.explanation(), null, options, spec, null, null);
    }

    private List<OptionInput> choiceOptions(List<String> values, String answer) {
        if (values == null || values.size() < 2 || values.size() > 8) throw invalid("Cần từ 2 đến 8 lựa chọn");
        if (values.stream().anyMatch(value -> value == null || value.isBlank())) throw invalid("Các lựa chọn phải liền nhau và không được trống");
        Set<Integer> correct = new HashSet<>();
        for (String part : answer.split(";")) {
            String letter = part.trim().toUpperCase(Locale.ROOT);
            if (letter.length() != 1 || letter.charAt(0) < 'A' || letter.charAt(0) - 'A' >= values.size())
                throw invalid("Đáp án đúng không khớp danh sách lựa chọn (dùng chữ cái, ví dụ A hoặc A;C)");
            correct.add(letter.charAt(0) - 'A');
        }
        List<OptionInput> options = new ArrayList<>();
        for (int j = 0; j < values.size(); j++) options.add(new OptionInput(values.get(j).trim(), correct.contains(j)));
        return options;
    }

    private QuestionCategory requireTarget(Long bankId, Long categoryId, Long actor, boolean admin) {
        QuestionCategory category = banks.requireEditableCategory(categoryId, actor, admin);
        if (!category.getBankId().equals(bankId)) throw invalid("Danh mục không thuộc ngân hàng đã chọn");
        return category;
    }
    private QuestionType type(String value) {
        if (value == null || value.isBlank()) return QuestionType.mcq;
        try {
            QuestionType type = QuestionType.valueOf(value.trim().toLowerCase(Locale.ROOT));
            if (CSV_TYPES.contains(type)) return type;
        } catch (IllegalArgumentException ignored) { }
        throw invalid("Loại câu chỉ nhận mcq, multiple_choice, true_false hoặc short_answer");
    }
    private QuestionDifficulty difficulty(String value) { return value == null || value.isBlank() ? QuestionDifficulty.medium : parseDifficulty(value); }
    private QuestionDifficulty parseDifficulty(String value) { try { return QuestionDifficulty.valueOf(value.trim().toLowerCase(Locale.ROOT)); } catch (IllegalArgumentException ex) { return null; } }
    private String normalize(String value) { return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
    private String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private LmsException invalid(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
