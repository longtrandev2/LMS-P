package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

@Service
@RequiredArgsConstructor
public class QuestionCsvService {
    private final QuestionBankService banks;
    private final QuestionRepository questions;
    private final QuestionOptionRepository options;
    private final QuestionVersionService snapshots;
    private final UserRepository users;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public QuestionCsvPreview preview(Long bankId, Long categoryId, QuestionCsvRequest request, Long actor, boolean admin) {
        QuestionCategory category = requireTarget(bankId, categoryId, actor, admin);
        Set<String> seen = new HashSet<>();
        List<QuestionCsvPreviewRow> rows = new ArrayList<>(); int valid = 0;
        for (int i = 0; i < request.rows().size(); i++) {
            QuestionCsvRow row = request.rows().get(i); int rowNo = row == null ? i + 2 : row.row();
            String error = validate(row);
            if (error == null) {
                String key = normalize(row.content());
                if (!seen.add(key) || questions.existsByCategory_Bank_IdAndContentIgnoreCaseAndDeletedFalse(bankId, row.content().trim()))
                    error = "Câu hỏi đã tồn tại trong ngân hàng";
            }
            boolean ok = error == null; if (ok) valid++;
            rows.add(new QuestionCsvPreviewRow(rowNo, row == null ? "" : row.content(), ok,
                    ok ? null : "INVALID_ROW", error));
        }
        return new QuestionCsvPreview(valid, rows);
    }

    @Transactional
    public QuestionImportResult importRows(Long bankId, Long categoryId, QuestionCsvRequest request, Long actorId, boolean admin) {
        QuestionCategory category = requireTarget(bankId, categoryId, actorId, admin);
        QuestionCsvPreview preview = preview(bankId, categoryId, request, actorId, admin);
        User actor = users.findById(actorId).orElseThrow(() -> missing("Không tìm thấy người dùng"));
        List<QuestionImportError> errors = new ArrayList<>(); int created = 0;
        for (int i = 0; i < request.rows().size(); i++) {
            QuestionCsvRow row = request.rows().get(i); QuestionCsvPreviewRow check = preview.rows().get(i);
            if (!check.valid()) { errors.add(new QuestionImportError(check.row(), check.code(), check.reason())); continue; }
            QuestionDifficulty difficulty = difficulty(row.difficulty());
            Question question = questions.save(new Question(actor, category, QuestionType.mcq, row.content().trim(),
                    blankNull(row.topic()), difficulty));
            questions.flush();
            int correctIndex = Character.toLowerCase(row.correct_option().trim().charAt(0)) - 'a';
            List<QuestionOption> answerOptions = new ArrayList<>();
            for (int j = 0; j < row.options().size(); j++) answerOptions.add(new QuestionOption(question,
                    row.options().get(j).trim(), j == correctIndex, j + 1));
            options.saveAll(answerOptions); snapshots.saveVersion(question, actor);
            audit.record(actorId, "question.create", "question", question.getId(), null,
                    Map.of("type", "mcq", "content", question.getContent(), "category_id", categoryId, "source", "csv"));
            created++;
        }
        return new QuestionImportResult(created, errors);
    }

    private QuestionCategory requireTarget(Long bankId, Long categoryId, Long actor, boolean admin) {
        QuestionCategory category = banks.requireEditableCategory(categoryId, actor, admin);
        if (!category.getBankId().equals(bankId)) throw invalid("Danh mục không thuộc ngân hàng đã chọn");
        return category;
    }
    private String validate(QuestionCsvRow row) {
        if (row == null || row.content() == null || row.content().isBlank()) return "Thiếu nội dung câu hỏi";
        if (row.difficulty() != null && !row.difficulty().isBlank() && parseDifficulty(row.difficulty()) == null) return "Độ khó chỉ nhận easy, medium hoặc hard";
        if (row.options() == null || row.options().size() < 2 || row.options().size() > 6) return "Cần từ 2 đến 6 lựa chọn";
        if (row.options().stream().anyMatch(value -> value == null || value.isBlank())) return "Các lựa chọn phải liền nhau và không được trống";
        if (row.correct_option() == null || row.correct_option().trim().length() != 1) return "Đáp án đúng phải là một chữ cái A-F";
        int correct = Character.toLowerCase(row.correct_option().trim().charAt(0)) - 'a';
        return correct < 0 || correct >= row.options().size() ? "Đáp án đúng không khớp danh sách lựa chọn" : null;
    }
    private QuestionDifficulty difficulty(String value) { return value == null || value.isBlank() ? QuestionDifficulty.medium : parseDifficulty(value); }
    private QuestionDifficulty parseDifficulty(String value) { try { return QuestionDifficulty.valueOf(value.trim().toLowerCase(Locale.ROOT)); } catch (IllegalArgumentException ex) { return null; } }
    private String normalize(String value) { return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
    private String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private LmsException missing(String message) { return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null); }
    private LmsException invalid(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
