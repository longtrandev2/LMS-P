package vn.lmsp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.GradingDtos.WorkerPayload;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.TestResultStatus;
import vn.lmsp.model.Submission;

@Component
public class GradingScoreService {
    public record Score(BigDecimal total, Map<Integer, BigDecimal> tests) { }

    public void validateProblem(QuestionSnapshot snapshot) {
        if (snapshot.programming() == null || snapshot.test_cases() == null
                || snapshot.test_cases().isEmpty() || snapshot.test_cases().size() > 200)
            throw new IllegalArgumentException("Đề lập trình cần từ 1 đến 200 test case");
        var languages = snapshot.programming().allowed_languages();
        if (languages == null || languages.isEmpty() || !java.util.Set.of("python", "c", "cpp", "java").containsAll(languages))
            throw new IllegalArgumentException("Đề lập trình cần ít nhất một ngôn ngữ hợp lệ");
        var seen = new java.util.HashSet<Integer>();
        for (var test : snapshot.test_cases()) {
            if (test.position() < 1 || !seen.add(test.position()) || test.weight() == null || test.weight().signum() <= 0)
                throw new IllegalArgumentException("Vị trí hoặc trọng số test case không hợp lệ");
        }
    }

    public Score score(Submission submission, QuestionSnapshot snapshot, WorkerPayload payload) {
        validateProblem(snapshot);
        var tests = payload.test_results() == null ? java.util.List.<vn.lmsp.dto.GradingDtos.WorkerTestResult>of()
                : payload.test_results();
        if (payload.status() == SubmissionStatus.failed || payload.compile_error()) {
            if (!tests.isEmpty()) throw new IllegalArgumentException("Lỗi hệ thống/biên dịch không kèm kết quả chạy test");
            return new Score(payload.status() == SubmissionStatus.failed ? null : BigDecimal.ZERO.setScale(2), Map.of());
        }
        Map<Integer, TestCaseView> expected = new HashMap<>();
        snapshot.test_cases().forEach(test -> expected.put(test.position(), test));
        if (tests.size() != expected.size()) throw new IllegalArgumentException("Thiếu kết quả test case");
        BigDecimal totalWeight = expected.values().stream().map(TestCaseView::weight).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal factor = BigDecimal.valueOf(100 - submission.getLatePenaltyPercent()).movePointLeft(2);
        Map<Integer, BigDecimal> scores = new HashMap<>();
        BigDecimal passedWeight = BigDecimal.ZERO;
        for (var test : tests) {
            if (!expected.containsKey(test.position()) || scores.containsKey(test.position()))
                throw new IllegalArgumentException("Test case không thuộc snapshot hoặc bị trùng");
            BigDecimal weight = test.status() == TestResultStatus.passed ? expected.get(test.position()).weight() : BigDecimal.ZERO;
            passedWeight = passedWeight.add(weight);
            scores.put(test.position(), calculate(submission.getMaxScore(), weight, totalWeight, factor));
        }
        return new Score(calculate(submission.getMaxScore(), passedWeight, totalWeight, factor), scores);
    }

    private BigDecimal calculate(BigDecimal max, BigDecimal weight, BigDecimal total, BigDecimal factor) {
        return max.multiply(weight).multiply(factor).divide(total, 2, RoundingMode.HALF_UP);
    }
}
