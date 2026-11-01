package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionContentDtos.*;
import vn.lmsp.dto.QuestionDtos.OptionView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.QuestionType;

/**
 * Kiểm tra câu trả lời đúng trường theo loại câu và chuẩn hóa để lưu `submissions.response`
 * — docs/assessment-spec.md §3.2. Trả `null` khi câu bỏ trống.
 */
@Component
public class AnswerNormalizer {
    public AnswerResponse normalize(QuestionSnapshot snapshot, AnswerInput answer) {
        if (answer == null) return null;
        QuestionType type = snapshot.type();
        if (type == QuestionType.programming) throw bad("Câu lập trình cần language và source_code");
        rejectForeignFields(type, answer);
        AnswerSpec spec = snapshot.answer_spec();
        return switch (type) {
            case mcq, true_false, multiple_choice -> choices(snapshot, answer.selected_option_ids());
            case short_answer -> text(answer.text());
            case numeric -> answer.number() == null ? null : of(null, null, plain(answer.number()), null, null, null);
            case fill_blank -> blanks(spec, answer.blanks());
            case matching -> matches(spec, answer.matches());
            case ordering -> order(spec, answer.order());
            case programming -> throw bad("Câu lập trình cần language và source_code");
        };
    }

    private void rejectForeignFields(QuestionType type, AnswerInput answer) {
        boolean foreign = (answer.selected_option_ids() != null && !type.isChoice())
                || (answer.text() != null && type != QuestionType.short_answer)
                || (answer.number() != null && type != QuestionType.numeric)
                || (answer.blanks() != null && type != QuestionType.fill_blank)
                || (answer.matches() != null && type != QuestionType.matching)
                || (answer.order() != null && type != QuestionType.ordering);
        if (foreign) throw bad("Câu trả lời chứa trường không thuộc loại câu " + type.name());
    }

    private AnswerResponse choices(QuestionSnapshot snapshot, List<Long> selected) {
        if (selected == null || selected.isEmpty()) return null;
        Set<Long> unique = new TreeSet<>(selected);
        if (unique.size() != selected.size()) throw bad("Không được chọn trùng một lựa chọn");
        if (snapshot.type() != QuestionType.multiple_choice && unique.size() > 1)
            throw bad("Câu một đáp án chỉ nhận một lựa chọn");
        Set<Long> known = new HashSet<>();
        if (snapshot.options() != null) snapshot.options().stream().map(OptionView::id).forEach(known::add);
        if (!known.containsAll(unique)) throw bad("Lựa chọn không thuộc câu hỏi này");
        return of(List.copyOf(unique), null, null, null, null, null);
    }

    private AnswerResponse text(String value) {
        String normalized = AnswerText.normalize(value);
        return normalized == null || normalized.isEmpty() ? null : of(null, normalized, null, null, null, null);
    }

    private AnswerResponse blanks(AnswerSpec spec, List<String> values) {
        if (values == null) return null;
        int expected = spec == null || spec.blanks() == null ? 0 : spec.blanks().size();
        if (values.size() != expected) throw bad("Cần điền đúng " + expected + " ô trống");
        List<String> normalized = values.stream().map(AnswerText::normalize).toList();
        return normalized.stream().allMatch(String::isEmpty) ? null : of(null, null, null, normalized, null, null);
    }

    private AnswerResponse matches(AnswerSpec spec, Map<String, String> values) {
        if (values == null || values.isEmpty()) return null;
        Set<String> lefts = new HashSet<>(), rights = new HashSet<>();
        if (spec != null && spec.pairs() != null) spec.pairs().forEach(pair -> { lefts.add(pair.id()); rights.add(pair.right_id()); });
        if (spec != null && spec.distractors() != null) spec.distractors().forEach(item -> rights.add(item.id()));
        if (!lefts.containsAll(values.keySet()) || !rights.containsAll(values.values()))
            throw bad("Cặp ghép không thuộc câu hỏi này");
        return of(null, null, null, null, new TreeMap<>(values), null);
    }

    private AnswerResponse order(AnswerSpec spec, List<String> values) {
        if (values == null || values.isEmpty()) return null;
        List<String> ids = spec == null || spec.items() == null ? List.of() : spec.items().stream().map(ChoiceItem::id).toList();
        if (values.size() != ids.size() || !new HashSet<>(values).equals(new HashSet<>(ids)))
            throw bad("Thứ tự phải là hoán vị đầy đủ các mục của câu hỏi");
        return of(null, null, null, null, null, List.copyOf(values));
    }

    /** Bỏ số 0 thừa để `80` và `80.0` là cùng một câu trả lời. */
    static BigDecimal plain(BigDecimal value) {
        return value == null ? null : new BigDecimal(value.stripTrailingZeros().toPlainString());
    }

    private static AnswerResponse of(List<Long> selected, String text, BigDecimal number, List<String> blanks,
                                     Map<String, String> matches, List<String> order) {
        return new AnswerResponse(selected, text, number, blanks, matches, order);
    }

    private static LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
