package vn.lmsp.service;

import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import java.nio.charset.StandardCharsets;

@Component
public class ProgrammingProblemValidator {
    private static final int MAX_TEST_FIELD_BYTES = 128 * 1024;
    private static final int MAX_TOTAL_TEST_BYTES = 1024 * 1024;

    public void validateProblem(QuestionSnapshot snapshot) {
        if (snapshot.programming() == null || snapshot.test_cases() == null
                || snapshot.test_cases().isEmpty() || snapshot.test_cases().size() > 200)
            throw new IllegalArgumentException("Đề lập trình cần từ 1 đến 200 test case");
        var languages = snapshot.programming().allowed_languages();
        if (languages == null || languages.isEmpty()
                || !java.util.Set.of("python", "c", "cpp", "java").containsAll(languages))
            throw new IllegalArgumentException("Đề lập trình cần ít nhất một ngôn ngữ hợp lệ");
        var positions = new java.util.HashSet<Integer>();
        long totalTestBytes = 0;
        for (var test : snapshot.test_cases()) {
            if (test.position() < 1 || !positions.add(test.position())
                    || test.input() == null || test.expected_output() == null)
                throw new IllegalArgumentException("Test case không hợp lệ hoặc vị trí bị trùng");
            int inputBytes = test.input().getBytes(StandardCharsets.UTF_8).length;
            int outputBytes = test.expected_output().getBytes(StandardCharsets.UTF_8).length;
            if (inputBytes > MAX_TEST_FIELD_BYTES || outputBytes > MAX_TEST_FIELD_BYTES)
                throw new IllegalArgumentException("Mỗi input/output test tối đa 128 KiB");
            totalTestBytes += (long) inputBytes + outputBytes;
            if (totalTestBytes > MAX_TOTAL_TEST_BYTES)
                throw new IllegalArgumentException("Tổng dữ liệu test tối đa 1 MiB");
        }
    }
}
