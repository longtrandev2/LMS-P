package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.QuestionOptionRepository;
import vn.lmsp.repository.QuestionProgrammingRepository;
import vn.lmsp.repository.TestCaseRepository;

/** Ghi phần nội dung đã chuẩn hóa (lựa chọn, đáp án, lập trình, test) của một câu hỏi; bỏ qua phần không đổi. */
@Service
@RequiredArgsConstructor
public class QuestionContentService {
    private final QuestionOptionRepository options;
    private final QuestionProgrammingRepository programming;
    private final TestCaseRepository testCases;

    @Transactional
    public void apply(Question question, QuestionContent content) {
        question.updateAnswer(content.explanation(), content.scoringMode(), content.answerSpec());
        if (question.getType().isChoice()) replaceOptions(question, content.options());
        if (content.programming() != null) {
            ProgrammingInput input = content.programming();
            var entity = programming.findById(question.getId())
                    .orElseGet(() -> new QuestionProgramming(question, null, null, null, input.time_limit_ms(), input.memory_limit_mb()));
            entity.update(input.starter_codes(), input.starter_code(), input.solution_code(), input.solution_language(),
                    input.allowed_languages(), input.time_limit_ms(), input.memory_limit_mb(),
                    input.checker_mode(), input.checker_epsilon());
            programming.save(entity);
            replaceTests(question, content.testCases());
        }
    }

    /** Lựa chọn hiện tại dưới dạng input — dùng khi PATCH không gửi `options`. */
    @Transactional(readOnly = true)
    public List<OptionInput> currentOptions(Long questionId) {
        return options.findAllByQuestion_IdOrderByPositionAsc(questionId).stream()
                .map(option -> new OptionInput(option.getContent(), option.isCorrect())).toList();
    }

    @Transactional(readOnly = true)
    public ProgrammingInput currentProgramming(Long questionId) {
        return programming.findById(questionId).map(item -> new ProgrammingInput(item.getStarterCode(), item.getStarterCodes(),
                item.getSolutionCode(), item.getSolutionLanguage(), item.getAllowedLanguages(), item.getTimeLimitMs(),
                item.getMemoryLimitMb(), item.getCheckerMode(), item.getCheckerEpsilon())).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<TestCaseInput> currentTests(Long questionId) {
        return testCases.findAllByQuestion_IdOrderByPositionAsc(questionId).stream()
                .map(test -> new TestCaseInput(test.getInput(), test.getExpectedOutput(), test.isPublicCase(), test.getWeight())).toList();
    }

    private void replaceOptions(Question question, List<OptionInput> rows) {
        var existing = options.findAllByQuestion_IdOrderByPositionAsc(question.getId());
        if (sameOptions(existing, rows)) return;
        options.deleteAllByQuestion_Id(question.getId());
        options.flush();
        List<QuestionOption> created = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++)
            created.add(new QuestionOption(question, rows.get(i).content(), Boolean.TRUE.equals(rows.get(i).is_correct()), i + 1));
        options.saveAll(created);
    }

    private void replaceTests(Question question, List<TestCaseInput> rows) {
        var existing = testCases.findAllByQuestion_IdOrderByPositionAsc(question.getId());
        if (sameTests(existing, rows)) return;
        testCases.deleteAllByQuestion_Id(question.getId());
        testCases.flush();
        List<TestCase> created = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            TestCaseInput row = rows.get(i);
            created.add(new TestCase(question, row.input(), row.expected_output(), Boolean.TRUE.equals(row.is_public()), BigDecimal.ONE, i + 1));
        }
        testCases.saveAll(created);
    }

    private static boolean sameOptions(List<QuestionOption> existing, List<OptionInput> rows) {
        if (existing.size() != rows.size()) return false;
        for (int i = 0; i < rows.size(); i++) {
            QuestionOption old = existing.get(i);
            if (old.getPosition() != i + 1 || !old.getContent().equals(rows.get(i).content())
                    || old.isCorrect() != Boolean.TRUE.equals(rows.get(i).is_correct())) return false;
        }
        return true;
    }

    private static boolean sameTests(List<TestCase> existing, List<TestCaseInput> rows) {
        if (existing.size() != rows.size()) return false;
        for (int i = 0; i < rows.size(); i++) {
            TestCase old = existing.get(i);
            TestCaseInput row = rows.get(i);
            if (old.getPosition() != i + 1 || !old.getInput().equals(row.input()) || !old.getExpectedOutput().equals(row.expected_output())
                    || old.isPublicCase() != Boolean.TRUE.equals(row.is_public()) || old.getWeight().compareTo(BigDecimal.ONE) != 0) return false;
        }
        return true;
    }
}
