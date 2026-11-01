package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.Utf8Text;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;

class GradingMapperTest {
    @Test void studentReceivesVerdictButNotPrivateWorkerLogs() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        var job = new GradingJob(submission, 5, LocalDateTime.now());
        var result = new GradingResult(job, GradingVerdict.AC, false, false,
                "private-input", "private-output", 3, LocalDateTime.now());
        var mapper = new GradingMapper();

        var studentView = mapper.toResult(result, java.util.List.of(), java.util.List.of(), false);
        assertThat(studentView.verdict()).isEqualTo(GradingVerdict.AC);
        assertThat(studentView.compile_output()).isNull();
        assertThat(studentView.error_message()).isNull();
        assertThat(new ObjectMapper().findAndRegisterModules().valueToTree(studentView).toString())
                .doesNotContain("private-input", "private-output");
        assertThat(mapper.toResult(result, java.util.List.of(), java.util.List.of(), true).error_message()).isEqualTo("private-output");
    }

    @Test void studentSeesTestDataOnlyForPublicTestsWhileLecturerSeesAll() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        var result = new GradingResult(new GradingJob(submission, 5, LocalDateTime.now()), GradingVerdict.WA, false, false,
                null, null, 3, LocalDateTime.now());
        var tests = java.util.List.of(new TestResult(result, 1, GradingVerdict.AC, "3", 5, null, java.math.BigDecimal.ZERO),
                new TestResult(result, 2, GradingVerdict.WA, "hidden-actual", 6, null, java.math.BigDecimal.ZERO));
        var cases = programmingSnapshot().test_cases();
        var mapper = new GradingMapper();

        var student = mapper.toResult(result, tests, cases, false).tests();
        assertThat(student.get(0).is_public()).isTrue();
        assertThat(student.get(0).input()).isEqualTo("1 2");
        assertThat(student.get(1).verdict()).isEqualTo(GradingVerdict.WA);
        assertThat(new ObjectMapper().valueToTree(student.get(1)).toString())
                .doesNotContain("private-input", "private-output", "hidden-actual");
        var lecturer = mapper.toResult(result, tests, cases, true).tests();
        assertThat(lecturer.get(1).input()).isEqualTo("private-input");
        assertThat(lecturer.get(1).output()).isEqualTo("hidden-actual");
    }

    @Test void utf8TruncationPreservesCharactersAtTheByteBoundary() {
        String clipped = Utf8Text.truncate("🙂".repeat(20000), 65535);
        assertThat(clipped.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(65535);
        assertThat(clipped).doesNotContain("\ufffd").hasSize(32766);
    }
}
