package vn.lmsp.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionContentDtos.*;
import vn.lmsp.dto.QuestionDtos.OptionView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.ScoringMode;

/** Chấm câu khách quan theo loại — docs/assessment-spec.md §3. Câu trả lời đã qua {@link AnswerNormalizer}. */
@Component
public class ObjectiveGrader {
    private static final MathContext PRECISION = MathContext.DECIMAL64;

    /** Tỉ lệ đúng f ∈ [0, 1]; câu bỏ trống (`response == null`) cho 0. */
    public BigDecimal fraction(QuestionSnapshot snapshot, AnswerResponse response) {
        if (response == null) return BigDecimal.ZERO;
        AnswerSpec spec = snapshot.answer_spec();
        boolean partial = snapshot.type().supportsPartialScoring() && snapshot.scoring_mode() == ScoringMode.partial;
        return switch (snapshot.type()) {
            case mcq, true_false -> single(snapshot.options(), response.selected_option_ids());
            case multiple_choice -> multiple(snapshot.options(), response.selected_option_ids(), partial);
            case short_answer -> spec != null && AnswerText.matchesAny(response.text(), spec.accepted(), spec.case_sensitive())
                    ? BigDecimal.ONE : BigDecimal.ZERO;
            case numeric -> numeric(spec, response.number());
            case fill_blank -> blanks(spec, response.blanks(), partial);
            case matching -> matching(spec, response.matches(), partial);
            case ordering -> ordering(spec, response.order(), partial);
            case programming -> BigDecimal.ZERO;
        };
    }

    /** Điểm câu = round(points × f × (100 − phạt muộn) / 100, 2). */
    public BigDecimal score(BigDecimal points, BigDecimal fraction, int latePenaltyPercent) {
        return points.multiply(fraction, PRECISION).multiply(BigDecimal.valueOf(100L - latePenaltyPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal single(List<OptionView> options, List<Long> selected) {
        if (options == null || selected == null || selected.size() != 1) return BigDecimal.ZERO;
        return options.stream().anyMatch(option -> option.is_correct() && option.id().equals(selected.get(0)))
                ? BigDecimal.ONE : BigDecimal.ZERO;
    }

    /** Partial kiểu Moodle: max(0, |S∩C|/|C| − |S∖C|/|W|); W rỗng thì vế sau = 0. */
    private BigDecimal multiple(List<OptionView> options, List<Long> selected, boolean partial) {
        if (options == null || selected == null) return BigDecimal.ZERO;
        Set<Long> correct = new HashSet<>(), wrong = new HashSet<>();
        options.forEach(option -> (option.is_correct() ? correct : wrong).add(option.id()));
        Set<Long> chosen = new HashSet<>(selected);
        if (!partial || correct.isEmpty()) return chosen.equals(correct) ? BigDecimal.ONE : BigDecimal.ZERO;
        long hits = chosen.stream().filter(correct::contains).count();
        long misses = chosen.size() - hits;
        BigDecimal value = ratio(hits, correct.size());
        if (!wrong.isEmpty()) value = value.subtract(ratio(misses, wrong.size()));
        return value.signum() < 0 ? BigDecimal.ZERO : value;
    }

    private BigDecimal numeric(AnswerSpec spec, BigDecimal number) {
        if (spec == null || spec.value() == null || number == null) return BigDecimal.ZERO;
        BigDecimal tolerance = spec.tolerance() == null ? BigDecimal.ZERO : spec.tolerance();
        return number.subtract(spec.value()).abs().compareTo(tolerance) <= 0 ? BigDecimal.ONE : BigDecimal.ZERO;
    }

    private BigDecimal blanks(AnswerSpec spec, List<String> values, boolean partial) {
        if (spec == null || spec.blanks() == null || spec.blanks().isEmpty() || values == null) return BigDecimal.ZERO;
        int hits = 0;
        for (int i = 0; i < spec.blanks().size() && i < values.size(); i++) {
            BlankSpec blank = spec.blanks().get(i);
            if (AnswerText.matchesAny(values.get(i), blank.accepted(), blank.case_sensitive())) hits++;
        }
        return portion(hits, spec.blanks().size(), partial);
    }

    private BigDecimal matching(AnswerSpec spec, Map<String, String> values, boolean partial) {
        if (spec == null || spec.pairs() == null || spec.pairs().isEmpty() || values == null) return BigDecimal.ZERO;
        int hits = (int) spec.pairs().stream().filter(pair -> Objects.equals(values.get(pair.id()), pair.right_id())).count();
        return portion(hits, spec.pairs().size(), partial);
    }

    private BigDecimal ordering(AnswerSpec spec, List<String> values, boolean partial) {
        if (spec == null || spec.items() == null || spec.items().isEmpty() || values == null) return BigDecimal.ZERO;
        int hits = 0;
        for (int i = 0; i < spec.items().size() && i < values.size(); i++)
            if (spec.items().get(i).id().equals(values.get(i))) hits++;
        return portion(hits, spec.items().size(), partial);
    }

    private BigDecimal portion(int hits, int total, boolean partial) {
        if (hits == total) return BigDecimal.ONE;
        return partial ? ratio(hits, total) : BigDecimal.ZERO;
    }

    private BigDecimal ratio(long numerator, long denominator) {
        return BigDecimal.valueOf(numerator).divide(BigDecimal.valueOf(denominator), PRECISION);
    }
}
