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

        var studentView = mapper.toResult(result, false);
        assertThat(studentView.verdict()).isEqualTo(GradingVerdict.AC);
        assertThat(studentView.compile_output()).isNull();
        assertThat(studentView.error_message()).isNull();
        assertThat(new ObjectMapper().findAndRegisterModules().valueToTree(studentView).toString())
                .doesNotContain("private-input", "private-output");
        assertThat(mapper.toResult(result, true).error_message()).isEqualTo("private-output");
    }

    @Test void utf8TruncationPreservesCharactersAtTheByteBoundary() {
        String clipped = Utf8Text.truncate("🙂".repeat(20000), 65535);
        assertThat(clipped.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(65535);
        assertThat(clipped).doesNotContain("\ufffd").hasSize(32766);
    }
}
