package vn.lmsp.service;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;

/** Kiểm tra đầy đủ đề lập trình khi xuất bản — docs/assessment-spec.md §4. Khi nộp bài không gọi lớp này. */
@Component
public class ProgrammingProblemValidator {
    private static final Set<String> LANGUAGES = Set.of("python", "c", "cpp", "java");
    private static final Set<String> CHECKERS = Set.of("token", "line", "float");
    private static final int KIB = 1024;

    public void validateProblem(QuestionSnapshot snapshot) {
        ProgrammingView programming = snapshot.programming();
        if (programming == null) throw invalid("Đề lập trình thiếu cấu hình chạy");
        validateSettings(programming);
        var tests = snapshot.test_cases();
        if (tests == null || tests.isEmpty() || tests.size() > 100)
            throw invalid("Đề lập trình cần từ 1 đến 100 test case");
        var positions = new HashSet<Integer>();
        long total = 0;
        for (var test : tests) {
            if (test.position() < 1 || !positions.add(test.position()) || test.input() == null || test.expected_output() == null)
                throw invalid("Test case không hợp lệ hoặc vị trí bị trùng");
            int input = bytes(test.input()), expected = bytes(test.expected_output());
            if (input > 128 * KIB) throw invalid("Input của mỗi test tối đa 128 KiB");
            if (expected > 64 * KIB) throw invalid("Output mong đợi của mỗi test tối đa 64 KiB");
            total += input + expected;
            if (total > 2L * KIB * KIB) throw invalid("Tổng dữ liệu test tối đa 2 MiB");
        }
    }

    private void validateSettings(ProgrammingView programming) {
        var languages = programming.allowed_languages();
        if (languages == null || languages.isEmpty() || !LANGUAGES.containsAll(languages))
            throw invalid("Đề lập trình cần ít nhất một ngôn ngữ hợp lệ (python, c, cpp, java)");
        if (programming.time_limit_ms() < 100 || programming.time_limit_ms() > 10_000)
            throw invalid("Giới hạn thời gian phải từ 100 đến 10000 ms");
        if (programming.memory_limit_mb() < 32 || programming.memory_limit_mb() > 1024)
            throw invalid("Giới hạn bộ nhớ phải từ 32 đến 1024 MB");
        String checker = programming.checker_mode() == null ? "token" : programming.checker_mode();
        if (!CHECKERS.contains(checker)) throw invalid("Cách so output phải là token, line hoặc float");
        Double epsilon = programming.checker_epsilon();
        if ("float".equals(checker) && epsilon != null && (epsilon < 1e-12 || epsilon > 1))
            throw invalid("Sai số checker phải từ 1e-12 đến 1");
        if (programming.starter_codes() != null) {
            for (var entry : programming.starter_codes().entrySet()) {
                if (!LANGUAGES.contains(entry.getKey())) throw invalid("Code mẫu có ngôn ngữ không hợp lệ");
                if (bytes(entry.getValue()) > 64 * KIB) throw invalid("Mỗi code mẫu tối đa 64 KiB");
            }
        }
        if (bytes(programming.starter_code()) > 64 * KIB) throw invalid("Mỗi code mẫu tối đa 64 KiB");
        String solution = programming.solution_code();
        if (solution != null && !solution.isBlank()) {
            if (bytes(solution) > 128 * KIB) throw invalid("Lời giải mẫu tối đa 128 KiB");
            if (programming.solution_language() != null && !languages.contains(programming.solution_language()))
                throw invalid("Ngôn ngữ lời giải phải thuộc danh sách ngôn ngữ được phép");
        }
    }

    private static int bytes(String value) {
        return value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;
    }

    private static IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException(message);
    }
}
