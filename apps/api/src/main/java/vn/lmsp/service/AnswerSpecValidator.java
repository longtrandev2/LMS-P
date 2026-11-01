package vn.lmsp.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionContentDtos.*;
import vn.lmsp.enums.QuestionType;

/** Kiểm tra và chuẩn hóa `answer_spec` theo loại câu — assessment-spec.md §1.2. */
@Component
@RequiredArgsConstructor
public class AnswerSpecValidator {
    private static final Pattern BLANK = Pattern.compile("\\[\\[(\\d+)]]");
    private static final int MAX_ANSWER = 200, MAX_TEXT = 500;
    private final AnswerIdGenerator ids;

    public AnswerSpec normalize(QuestionType type, String content, AnswerSpec spec) {
        if (spec == null) throw bad("Thiếu đáp án (answer_spec) cho loại câu này");
        return switch (type) {
            case short_answer -> new AnswerSpec(accepted(spec.accepted(), "Trả lời ngắn"), Boolean.TRUE.equals(spec.case_sensitive()),
                    null, null, null, null, null, null);
            case numeric -> numeric(spec);
            case fill_blank -> fillBlank(content, spec.blanks());
            case matching -> matching(spec);
            case ordering -> ordering(spec.items());
            default -> throw new IllegalArgumentException("Loại câu không dùng answer_spec: " + type);
        };
    }

    /** Số thứ tự các ô `[[n]]` theo thứ tự xuất hiện trong nội dung. */
    public static List<Integer> blankNumbers(String content) {
        List<Integer> numbers = new ArrayList<>();
        Matcher matcher = BLANK.matcher(content == null ? "" : content);
        while (matcher.find()) numbers.add(matcher.group(1).length() > 3 ? Integer.MAX_VALUE : Integer.parseInt(matcher.group(1)));
        return numbers;
    }

    private AnswerSpec numeric(AnswerSpec spec) {
        if (spec.value() == null) throw bad("Câu đáp số cần giá trị đáp án (value)");
        BigDecimal tolerance = spec.tolerance() == null ? BigDecimal.ZERO : spec.tolerance();
        if (tolerance.signum() < 0) throw bad("Sai số cho phép (tolerance) phải ≥ 0");
        return new AnswerSpec(null, null, spec.value(), tolerance, null, null, null, null);
    }

    private AnswerSpec fillBlank(String content, List<BlankSpec> blanks) {
        if (blanks == null || blanks.isEmpty() || blanks.size() > 20) throw bad("Câu điền chỗ trống cần 1–20 ô");
        List<Integer> numbers = blankNumbers(content);
        List<Integer> expected = new ArrayList<>();
        for (int i = 1; i <= blanks.size(); i++) expected.add(i);
        if (numbers.size() != blanks.size() || !new TreeSet<>(numbers).equals(new TreeSet<>(expected)))
            throw bad("Số ô [[n]] trong nội dung phải bằng số đáp án và đánh số liên tục từ 1, mỗi ô một lần");
        List<BlankSpec> normalized = new ArrayList<>();
        for (int i = 0; i < blanks.size(); i++) {
            BlankSpec blank = blanks.get(i);
            if (blank == null) throw bad("Ô [[" + (i + 1) + "]] thiếu đáp án");
            normalized.add(new BlankSpec(accepted(blank.accepted(), "Ô [[" + (i + 1) + "]]"), Boolean.TRUE.equals(blank.case_sensitive())));
        }
        return new AnswerSpec(null, null, null, null, normalized, null, null, null);
    }

    private AnswerSpec matching(AnswerSpec spec) {
        List<PairSpec> pairs = spec.pairs();
        List<ChoiceItem> distractors = spec.distractors() == null ? List.of() : spec.distractors();
        if (pairs == null || pairs.size() < 2 || pairs.size() > 12) throw bad("Câu ghép cặp cần 2–12 cặp");
        if (distractors.size() > 6) throw bad("Câu ghép cặp có tối đa 6 lựa chọn nhiễu");
        Set<String> used = new HashSet<>(), rights = new HashSet<>();
        List<PairSpec> normalizedPairs = new ArrayList<>();
        for (PairSpec pair : pairs) {
            if (pair == null) throw bad("Cặp ghép không được để trống");
            String left = text(pair.left(), "Vế trái"), right = text(pair.right(), "Vế phải");
            if (!rights.add(key(right))) throw bad("Các lựa chọn bên phải (kể cả lựa chọn nhiễu) không được trùng nhau");
            normalizedPairs.add(new PairSpec(ids.keepOrNew(pair.id(), used), left, right, ids.keepOrNew(pair.right_id(), used)));
        }
        List<ChoiceItem> normalizedDistractors = new ArrayList<>();
        for (ChoiceItem item : distractors) {
            String value = text(item == null ? null : item.text(), "Lựa chọn nhiễu");
            if (!rights.add(key(value))) throw bad("Các lựa chọn bên phải (kể cả lựa chọn nhiễu) không được trùng nhau");
            normalizedDistractors.add(new ChoiceItem(ids.keepOrNew(item.id(), used), value));
        }
        return new AnswerSpec(null, null, null, null, null, normalizedPairs, normalizedDistractors, null);
    }

    private AnswerSpec ordering(List<ChoiceItem> items) {
        if (items == null || items.size() < 2 || items.size() > 12) throw bad("Câu sắp xếp cần 2–12 mục");
        Set<String> used = new HashSet<>(), texts = new HashSet<>();
        List<ChoiceItem> normalized = new ArrayList<>();
        for (ChoiceItem item : items) {
            String value = text(item == null ? null : item.text(), "Mục sắp xếp");
            if (!texts.add(key(value))) throw bad("Các mục sắp xếp không được trùng nhau");
            normalized.add(new ChoiceItem(ids.keepOrNew(item.id(), used), value));
        }
        return new AnswerSpec(null, null, null, null, null, null, null, normalized);
    }

    private List<String> accepted(List<String> values, String label) {
        if (values == null || values.isEmpty() || values.size() > 20) throw bad(label + " cần 1–20 đáp án chấp nhận");
        Set<String> result = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null || value.isBlank()) throw bad(label + ": đáp án không được để trống");
            String trimmed = value.trim();
            if (trimmed.length() > MAX_ANSWER) throw bad(label + ": mỗi đáp án tối đa " + MAX_ANSWER + " ký tự");
            result.add(trimmed);
        }
        return List.copyOf(result);
    }

    private String text(String value, String label) {
        if (value == null || value.isBlank()) throw bad(label + " không được để trống");
        String trimmed = value.trim();
        if (trimmed.length() > MAX_TEXT) throw bad(label + " tối đa " + MAX_TEXT + " ký tự");
        return trimmed;
    }

    private static String key(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFC).trim().replaceAll("\\s+", " ");
    }

    private static LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
