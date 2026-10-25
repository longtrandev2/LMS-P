package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.Utf8Text;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;

class GradingMapperTest {
    @Test void hiddenTestOnlyExposesPassFailToStudent() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        var job = new GradingJob(submission, 5, LocalDateTime.now());
        var result = new GradingResult(job, BigDecimal.ZERO, false, false, "private-input", "private-output", 3, LocalDateTime.now());
        var test = new TestResult(result, 2, TestResultStatus.timeout, "private-output", 5000, 128, BigDecimal.ZERO);
        var mapper = new GradingMapper();

        var studentView = mapper.toResult(result, List.of(test), programmingSnapshot(), false);
        assertThat(studentView.tests()).singleElement().satisfies(view -> {
            assertThat(view.status()).isEqualTo("failed");
            assertThat(view.input()).isNull();
            assertThat(view.expected_output()).isNull();
            assertThat(view.output()).isNull();
            assertThat(view.time_ms()).isNull();
            assertThat(view.memory_kb()).isNull();
            assertThat(view.score()).isNull();
        });
        assertThat(new ObjectMapper().findAndRegisterModules().valueToTree(studentView).toString())
                .doesNotContain("private-input", "private-output");
        assertThat(mapper.toResult(result, List.of(test), programmingSnapshot(), true).tests().getFirst().input())
                .isEqualTo("private-input");
    }

    @Test void utf8TruncationPreservesCharactersAtTheByteBoundary() {
        String clipped = Utf8Text.truncate("🙂".repeat(20000), 65535);
        assertThat(clipped.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(65535);
        assertThat(clipped).doesNotContain("\ufffd").hasSize(32766);
    }
}
