package vn.lmsp.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.ProgrammingInput;
import vn.lmsp.dto.QuestionDtos.TestCaseInput;

/**
 * Kiểm tra phần lập trình và test khi soạn câu hỏi — assessment-spec.md §4. Ngôn ngữ, mặc định và trần giới hạn theo
 * cấu hình hệ thống (admin-spec.md §1); chỉ áp khi lưu nội dung câu, không áp lại cho phiên bản đã ghim.
 */
@Component
@RequiredArgsConstructor
public class ProgrammingContentValidator {
    public static final List<String> LANGUAGES = List.of("python", "c", "cpp", "java");
    public static final double DEFAULT_EPSILON = 1e-6;
    private static final int KIB = 1024;
    private static final int MAX_STARTER = 64 * KIB, MAX_SOLUTION = 128 * KIB;
    private static final int MAX_INPUT = 128 * KIB, MAX_EXPECTED = 64 * KIB, MAX_TOTAL = 2 * KIB * KIB;
    private final SettingsProvider settings;

    public ProgrammingInput validate(ProgrammingInput input) {
        if (input == null) throw bad("Thiếu cấu hình câu hỏi lập trình");
        List<String> languages = languages(input.allowed_languages());
        int time = input.time_limit_ms() == null ? settings.defaultTimeLimitMs() : input.time_limit_ms();
        int memory = input.memory_limit_mb() == null ? settings.defaultMemoryLimitMb() : input.memory_limit_mb();
        requireLimits(time, memory);
        String checker = input.checker_mode() == null || input.checker_mode().isBlank() ? "token" : input.checker_mode();
        if (!Set.of("token", "line", "float").contains(checker)) throw bad("Cách so output chỉ nhận token, line hoặc float");
        Double epsilon = null;
        if ("float".equals(checker)) {
            epsilon = input.checker_epsilon() == null ? DEFAULT_EPSILON : input.checker_epsilon();
            if (!(epsilon >= 1e-12 && epsilon <= 1)) throw bad("Sai số so số thực phải từ 1e-12 đến 1");
        }
        Map<String, String> starters = new LinkedHashMap<>();
        if (input.starter_codes() != null) input.starter_codes().forEach((language, code) -> {
            if (!LANGUAGES.contains(language)) throw bad("Ngôn ngữ starter code không hợp lệ: " + language);
            if (code == null || code.isBlank() || !languages.contains(language)) return;
            if (bytes(code) > MAX_STARTER) throw bad("Starter code mỗi ngôn ngữ tối đa 64 KiB");
            starters.put(language, code);
        });
        String legacyStarter = input.starter_code() == null || input.starter_code().isBlank() ? null : input.starter_code();
        if (legacyStarter != null && bytes(legacyStarter) > MAX_STARTER) throw bad("Starter code tối đa 64 KiB");
        String solution = input.solution_code() == null || input.solution_code().isBlank() ? null : input.solution_code();
        String solutionLanguage = null;
        if (solution != null) {
            if (bytes(solution) > MAX_SOLUTION) throw bad("Lời giải mẫu tối đa 128 KiB");
            solutionLanguage = input.solution_language();
            if (solutionLanguage == null || solutionLanguage.isBlank()) throw bad("Cần chọn ngôn ngữ của lời giải mẫu");
            if (!languages.contains(solutionLanguage)) throw bad("Ngôn ngữ lời giải phải thuộc danh sách ngôn ngữ cho phép");
        }
        return new ProgrammingInput(legacyStarter, starters.isEmpty() ? null : starters, solution, solutionLanguage,
                languages, time, memory, checker, epsilon);
    }

    /** Test đã chuẩn hóa: `is_public` mặc định ẩn, `weight` luôn 1. */
    public List<TestCaseInput> validateTests(List<TestCaseInput> tests) {
        if (tests == null || tests.isEmpty() || tests.size() > 100) throw bad("Câu lập trình cần từ 1 đến 100 test");
        long total = 0;
        List<TestCaseInput> result = new ArrayList<>();
        for (int i = 0; i < tests.size(); i++) {
            TestCaseInput test = tests.get(i);
            if (test == null || test.input() == null || test.expected_output() == null)
                throw bad("Test " + (i + 1) + " thiếu input hoặc output mong đợi");
            int input = bytes(test.input()), expected = bytes(test.expected_output());
            if (input > MAX_INPUT) throw bad("Input test " + (i + 1) + " vượt quá 128 KiB");
            if (expected > MAX_EXPECTED) throw bad("Output mong đợi của test " + (i + 1) + " vượt quá 64 KiB");
            total += input + expected;
            result.add(new TestCaseInput(test.input(), test.expected_output(), Boolean.TRUE.equals(test.is_public()), BigDecimal.ONE));
        }
        if (total > MAX_TOTAL) throw bad("Tổng dữ liệu test tối đa 2 MiB");
        return result;
    }

    /** Tổng dung lượng test của form kiểm tra nháp (input + expected nếu có). */
    public void requireTotalSize(List<String> values) {
        long total = values.stream().filter(Objects::nonNull).mapToLong(ProgrammingContentValidator::bytes).sum();
        if (total > MAX_TOTAL) throw bad("Tổng dữ liệu test tối đa 2 MiB");
    }

    /** Giới hạn chạy nằm trong [100 ms, trần cấu hình] và [32 MB, trần cấu hình]. */
    public void requireLimits(int time, int memory) {
        int maxTime = settings.maxTimeLimitMs(), maxMemory = settings.maxMemoryLimitMb();
        if (time < SettingDefinitions.TIME_FLOOR || time > maxTime)
            throw bad("Giới hạn thời gian phải từ " + SettingDefinitions.TIME_FLOOR + " đến " + maxTime + " ms");
        if (memory < SettingDefinitions.MEMORY_FLOOR || memory > maxMemory)
            throw bad("Giới hạn bộ nhớ phải từ " + SettingDefinitions.MEMORY_FLOOR + " đến " + maxMemory + " MB");
    }

    private List<String> languages(List<String> values) {
        if (values == null || values.isEmpty()) throw bad("Cần chọn ít nhất một ngôn ngữ lập trình");
        List<String> allowed = settings.allowedLanguages();
        Set<String> chosen = new HashSet<>();
        for (String value : values) {
            if (!LANGUAGES.contains(value)) throw bad("Ngôn ngữ không hợp lệ: " + value);
            if (!allowed.contains(value))
                throw bad("Ngôn ngữ " + value + " hiện không được phép; chỉ chọn: " + String.join(", ", allowed));
            chosen.add(value);
        }
        return LANGUAGES.stream().filter(chosen::contains).toList();
    }

    private static int bytes(String value) { return value.getBytes(StandardCharsets.UTF_8).length; }
    private static LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
