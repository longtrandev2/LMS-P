package vn.lmsp.mapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.model.Question;
import vn.lmsp.model.QuestionOption;
import vn.lmsp.model.QuestionProgramming;
import vn.lmsp.model.TestCase;

@Component
public class QuestionMapper {
    public QuestionSummary toSummary(Question question, int version) {
        return new QuestionSummary(question.getId(), question.getOwnerId(), question.getBankId(),
                question.getCourseId(), question.getCategoryId(), question.getBankName(), question.getCategoryName(),
                question.getType(), question.getContent(), question.getTopic(), question.getDifficulty(),
                version, question.getUpdatedAt());
    }

    public QuestionView toView(Question question, int version, QuestionSnapshot snapshot) {
        return new QuestionView(question.getId(), question.getOwnerId(), question.getBankId(), question.getCourseId(),
                question.getCategoryId(), question.getBankName(), question.getCategoryName(), question.getType(),
                question.getContent(), question.getTopic(), question.getDifficulty(), version,
                snapshot.explanation(), snapshot.scoring_mode(), snapshot.answer_spec(),
                snapshot.options(), snapshot.programming(), snapshot.test_cases(),
                question.getCreatedAt(), question.getUpdatedAt());
    }

    /** Snapshot đầy đủ để hiển thị và chấm — assessment-spec.md §2. */
    public QuestionSnapshot toSnapshot(Question question, List<QuestionOption> options,
            QuestionProgramming programming, List<TestCase> testCases) {
        return new QuestionSnapshot(question.getType(), question.getContent(), question.getTopic(),
                question.getDifficulty(), question.getExplanation(), question.getScoringMode(),
                options.stream().map(this::toOptionView).toList(), question.getAnswerSpec(),
                toProgrammingView(programming), testCases.stream().map(this::toTestCaseView).toList());
    }

    public Map<String, Object> toAuditValue(Question question) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("type", question.getType());
        value.put("content", question.getContent());
        value.put("topic", question.getTopic());
        value.put("difficulty", question.getDifficulty());
        value.put("category_id", question.getCategoryId());
        return value;
    }

    private OptionView toOptionView(QuestionOption option) {
        return new OptionView(option.getId(), option.getContent(), option.isCorrect(), option.getPosition());
    }

    /** `starter_code` (cột cũ) và `starter_codes` (cột mới) trả nguyên trạng; client ưu tiên `starter_codes`. */
    private ProgrammingView toProgrammingView(QuestionProgramming programming) {
        if (programming == null) return null;
        var starters = programming.getStarterCodes();
        return new ProgrammingView(programming.getStarterCode(), starters == null || starters.isEmpty() ? null : starters,
                programming.getSolutionCode(), programming.getSolutionLanguage(), programming.getAllowedLanguages(),
                programming.getTimeLimitMs(), programming.getMemoryLimitMb(),
                programming.getCheckerMode() == null ? "token" : programming.getCheckerMode(), programming.getCheckerEpsilon());
    }

    private TestCaseView toTestCaseView(TestCase testCase) {
        return new TestCaseView(testCase.getInput(), testCase.getExpectedOutput(), testCase.isPublicCase(),
                testCase.getWeight(), testCase.getPosition());
    }
}
