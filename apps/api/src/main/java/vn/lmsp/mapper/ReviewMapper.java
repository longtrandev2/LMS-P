package vn.lmsp.mapper;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionContentDtos.BlankSpec;
import vn.lmsp.dto.QuestionContentDtos.ChoiceItem;
import vn.lmsp.dto.QuestionDtos.OptionView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.ReviewDtos.CorrectAnswer;
import vn.lmsp.dto.ReviewDtos.ReviewQuestion;
import vn.lmsp.model.Submission;

/** Dữ liệu màn xem lại — docs/api-spec.md §6 "AttemptReview". */
@Component
public class ReviewMapper {
    public ReviewQuestion toReviewQuestion(AssignmentQuestionView question, QuestionSnapshot snapshot,
                                           Submission answer, BigDecimal maxScore, boolean showsAnswers) {
        BigDecimal score = answer == null || answer.getScore() == null ? BigDecimal.ZERO : answer.getScore();
        return new ReviewQuestion(question, answer == null ? null : SubmissionMapper.storedResponse(answer), score, maxScore,
                showsAnswers ? correctAnswer(snapshot) : null, showsAnswers ? snapshot.explanation() : null);
    }

    /** Đáp án đúng theo loại: option_ids · accepted · value/tolerance · blanks · matches · order. */
    public CorrectAnswer correctAnswer(QuestionSnapshot snapshot) {
        AnswerSpec spec = snapshot.answer_spec();
        return switch (snapshot.type()) {
            case mcq, true_false, multiple_choice -> new CorrectAnswer(snapshot.options() == null ? List.of()
                    : snapshot.options().stream().filter(OptionView::is_correct).map(OptionView::id).toList(),
                    null, null, null, null, null, null, null, null);
            case short_answer -> spec == null ? null : new CorrectAnswer(null, spec.accepted(),
                    Boolean.TRUE.equals(spec.case_sensitive()), null, null, null, null, null, null);
            case numeric -> spec == null ? null : new CorrectAnswer(null, null, null, spec.value(),
                    spec.tolerance() == null ? BigDecimal.ZERO : spec.tolerance(), null, null, null, null);
            case fill_blank -> spec == null || spec.blanks() == null ? null : new CorrectAnswer(null, null, null, null, null,
                    spec.blanks().stream().map(BlankSpec::accepted).toList(),
                    spec.blanks().stream().map(blank -> Boolean.TRUE.equals(blank.case_sensitive())).toList(), null, null);
            case matching -> spec == null || spec.pairs() == null ? null : new CorrectAnswer(null, null, null, null, null,
                    null, null, matches(spec), null);
            case ordering -> spec == null || spec.items() == null ? null : new CorrectAnswer(null, null, null, null, null,
                    null, null, null, spec.items().stream().map(ChoiceItem::id).toList());
            case programming -> null;
        };
    }

    private Map<String, String> matches(AnswerSpec spec) {
        Map<String, String> result = new LinkedHashMap<>();
        spec.pairs().forEach(pair -> result.put(pair.id(), pair.right_id()));
        return result;
    }
}
