package vn.lmsp.mapper;

import java.util.*;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.PaperDtos.*;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionContentDtos.ChoiceItem;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.service.PaperShuffler;

/**
 * Dựng một câu trong đề — docs/api-spec.md §6 "Đề cho sinh viên". Bản sinh viên không bao giờ chứa
 * `is_correct`, `answer_spec`, `explanation`, `solution_code` hay test ẩn.
 */
@Component
public class QuestionPaperMapper {
    /** `shuffler` = null: giữ thứ tự gốc (bản nháp xem trước). `position` là vị trí hiển thị sau khi trộn câu. */
    public AssignmentQuestionView student(AssignmentQuestion link, Long versionId, QuestionSnapshot snapshot,
                                          int position, PaperShuffler shuffler, boolean shuffleOptions) {
        Long qid = link.getQuestionId();
        AnswerSpec spec = snapshot.answer_spec();
        var options = options(snapshot, false);
        if (options != null && shuffler != null && shuffleOptions
                && (snapshot.type() == QuestionType.mcq || snapshot.type() == QuestionType.multiple_choice))
            options = shuffler.permute(options, qid * 4 + 1);
        MatchingView matching = null;
        if (snapshot.type() == QuestionType.matching && spec != null && spec.pairs() != null) {
            List<ChoiceItem> rights = rights(spec);
            if (shuffler != null) rights = shuffler.permuteAvoidingIdentity(rights, spec.pairs().size(), qid * 4 + 2);
            matching = new MatchingView(spec.pairs().stream().map(pair -> new ChoiceItem(pair.id(), pair.left())).toList(), rights);
        }
        List<ChoiceItem> items = null;
        if (snapshot.type() == QuestionType.ordering && spec != null && spec.items() != null)
            items = shuffler == null ? spec.items() : shuffler.permuteAvoidingIdentity(spec.items(), spec.items().size(), qid * 4 + 3);
        return new AssignmentQuestionView(qid, versionId, snapshot.type(), snapshot.content(), link.getPoints(), position,
                options, blankCount(snapshot), matching, items, programming(snapshot.programming(), snapshot.test_cases()),
                null, null, null, null, null, null);
    }

    /** Bản giảng viên: thứ tự gốc, kèm đáp án, `answer_spec`, giải thích và mọi test. */
    public AssignmentQuestionView lecturer(AssignmentQuestion link, Long versionId, QuestionSnapshot snapshot) {
        AnswerSpec spec = snapshot.answer_spec();
        MatchingView matching = snapshot.type() != QuestionType.matching || spec == null || spec.pairs() == null ? null
                : new MatchingView(spec.pairs().stream().map(pair -> new ChoiceItem(pair.id(), pair.left())).toList(), rights(spec));
        List<ChoiceItem> items = snapshot.type() == QuestionType.ordering && spec != null ? spec.items() : null;
        ScoringMode mode = snapshot.scoring_mode() == null ? ScoringMode.all_or_nothing : snapshot.scoring_mode();
        return new AssignmentQuestionView(link.getQuestionId(), versionId, snapshot.type(), snapshot.content(),
                link.getPoints(), link.getPosition(), options(snapshot, true), blankCount(snapshot), matching, items,
                programming(snapshot.programming(), snapshot.test_cases()), snapshot.topic(), snapshot.difficulty(),
                snapshot.explanation(), mode, spec, snapshot.test_cases() == null ? List.of() : snapshot.test_cases());
    }

    private List<AssignmentOptionView> options(QuestionSnapshot snapshot, boolean withAnswers) {
        if (!snapshot.type().isChoice() || snapshot.options() == null) return null;
        return snapshot.options().stream().map(option -> new AssignmentOptionView(option.id(), option.content(),
                withAnswers ? option.is_correct() : null)).toList();
    }

    private List<ChoiceItem> rights(AnswerSpec spec) {
        List<ChoiceItem> rights = new ArrayList<>();
        spec.pairs().forEach(pair -> rights.add(new ChoiceItem(pair.right_id(), pair.right())));
        if (spec.distractors() != null) rights.addAll(spec.distractors());
        return rights;
    }

    private Integer blankCount(QuestionSnapshot snapshot) {
        if (snapshot.type() != QuestionType.fill_blank) return null;
        var spec = snapshot.answer_spec();
        return spec == null || spec.blanks() == null ? 0 : spec.blanks().size();
    }

    static ProgrammingPaper programming(ProgrammingView view, List<TestCaseView> tests) {
        if (view == null) return null;
        var samples = tests == null ? List.<SampleView>of() : tests.stream().filter(TestCaseView::is_public)
                .sorted(Comparator.comparingInt(TestCaseView::position))
                .map(test -> new SampleView(test.position(), test.input(), test.expected_output())).toList();
        List<String> languages = view.allowed_languages() == null ? List.of() : view.allowed_languages();
        return new ProgrammingPaper(languages, view.time_limit_ms(), view.memory_limit_mb(),
                view.checker_mode() == null ? "token" : view.checker_mode(), starterCodes(view, languages), samples);
    }

    /** Map theo ngôn ngữ; snapshot cũ chỉ có `starter_code` thì dùng chung cho mọi ngôn ngữ được phép. */
    static Map<String, String> starterCodes(ProgrammingView view, List<String> languages) {
        if (view.starter_codes() != null && !view.starter_codes().isEmpty()) return new TreeMap<>(view.starter_codes());
        Map<String, String> result = new TreeMap<>();
        if (view.starter_code() != null && !view.starter_code().isEmpty())
            languages.forEach(language -> result.put(language, view.starter_code()));
        return result;
    }
}
