package vn.lmsp.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;

/** Kiểm tra toàn bộ nội dung một câu hỏi theo loại — assessment-spec.md §1–4. Không đụng DB. */
@Component
@RequiredArgsConstructor
public class QuestionContentValidator {
    public static final String TRUE_LABEL = "Đúng", FALSE_LABEL = "Sai";
    private static final int MAX_CONTENT = 60_000, MAX_EXPLANATION = 10_000;
    private final AnswerSpecValidator answers;
    private final ProgrammingContentValidator programs;

    public QuestionContent validate(QuestionType type, String content, String explanation, ScoringMode scoring,
            List<OptionInput> options, AnswerSpec spec, ProgrammingInput programming, List<TestCaseInput> tests) {
        if (content == null || content.isBlank()) throw bad("Nội dung câu hỏi không được để trống");
        String body = content.trim();
        if (body.length() > MAX_CONTENT) throw bad("Nội dung câu hỏi tối đa 60.000 ký tự");
        String note = explanation == null || explanation.isBlank() ? null : explanation.trim();
        if (note != null && note.length() > MAX_EXPLANATION) throw bad("Giải thích tối đa 10.000 ký tự");
        ScoringMode mode = scoringMode(type, scoring);
        boolean hasOptions = options != null && !options.isEmpty();
        boolean hasTests = tests != null && !tests.isEmpty();
        if (type != QuestionType.programming && (programming != null || hasTests))
            throw bad("Chỉ câu lập trình mới nhận cấu hình lập trình và test");
        if (!type.isChoice() && hasOptions) throw bad("Loại câu này không dùng danh sách lựa chọn");
        if (!type.usesAnswerSpec() && spec != null) throw bad("Loại câu này không dùng answer_spec");
        return switch (type) {
            case mcq, multiple_choice -> new QuestionContent(body, note, mode, choices(type, options), null, null, List.of());
            case true_false -> new QuestionContent(body, note, mode, trueFalse(options), null, null, List.of());
            case programming -> new QuestionContent(body, note, mode, List.of(), null,
                    programs.validate(programming), programs.validateTests(tests));
            default -> new QuestionContent(body, note, mode, List.of(), answers.normalize(type, body, spec), null, List.of());
        };
    }

    /** Loại không hỗ trợ chấm từng phần luôn `all_or_nothing`; mặc định theo assessment-spec.md §1.1. */
    public static ScoringMode scoringMode(QuestionType type, ScoringMode requested) {
        if (!type.supportsPartialScoring()) return ScoringMode.all_or_nothing;
        if (requested != null) return requested;
        return type == QuestionType.multiple_choice ? ScoringMode.all_or_nothing : ScoringMode.partial;
    }

    private List<OptionInput> choices(QuestionType type, List<OptionInput> options) {
        if (options == null || options.size() < 2 || options.size() > 8) throw bad("Câu lựa chọn cần từ 2 đến 8 lựa chọn");
        List<OptionInput> result = new ArrayList<>();
        for (OptionInput option : options) {
            if (option == null || option.content() == null || option.content().isBlank()) throw bad("Nội dung lựa chọn không được để trống");
            if (option.content().trim().length() > MAX_CONTENT) throw bad("Nội dung lựa chọn quá dài");
            result.add(new OptionInput(option.content().trim(), Boolean.TRUE.equals(option.is_correct())));
        }
        long correct = result.stream().filter(OptionInput::is_correct).count();
        if (type == QuestionType.mcq && correct != 1) throw bad("Câu một đáp án cần đúng 1 lựa chọn đúng");
        if (type == QuestionType.multiple_choice && correct < 1) throw bad("Câu nhiều đáp án cần ít nhất 1 lựa chọn đúng");
        return result;
    }

    /** Server luôn lưu `Đúng`, `Sai`; client chỉ cho biết lựa chọn nào đúng (theo nhãn, nếu không thì theo vị trí). */
    private List<OptionInput> trueFalse(List<OptionInput> options) {
        if (options == null || options.isEmpty()) throw bad("Câu đúng/sai cần cho biết lựa chọn đúng");
        if (options.size() > 2) throw bad("Câu đúng/sai chỉ có 2 lựa chọn");
        int correctIndex = -1;
        for (int i = 0; i < options.size(); i++) {
            OptionInput option = options.get(i);
            if (option == null || !Boolean.TRUE.equals(option.is_correct())) continue;
            if (correctIndex >= 0) throw bad("Câu đúng/sai chỉ có 1 lựa chọn đúng");
            String label = option.content() == null ? "" : option.content().trim().toLowerCase(Locale.ROOT);
            correctIndex = label.equals("sai") || label.equals("false") ? 1
                    : label.equals("đúng") || label.equals("true") ? 0 : i;
        }
        if (correctIndex < 0) throw bad("Câu đúng/sai cần đúng 1 lựa chọn đúng");
        return List.of(new OptionInput(TRUE_LABEL, correctIndex == 0), new OptionInput(FALSE_LABEL, correctIndex == 1));
    }

    private static LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
