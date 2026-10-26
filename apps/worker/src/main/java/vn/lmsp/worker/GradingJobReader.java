package vn.lmsp.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GradingJobReader {
    private static final String SQL = """
            SELECT j.job_id, s.id submission_id, q.id question_id, s.source_code, s.language, s.status,
                   s.question_version_id, v.snapshot
            FROM grading_jobs j
            JOIN submissions s ON s.id = j.submission_id
            JOIN questions q ON q.id = s.question_id
            JOIN question_versions v ON v.id = s.question_version_id
            WHERE j.job_id = ? AND s.id = ?
            """;
    private static final int MAX_SOURCE_BYTES = 128 * 1024;
    private static final int MAX_TEST_BYTES = 128 * 1024;
    private static final int MAX_TOTAL_TEST_BYTES = 1024 * 1024;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public GradingJobReader(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public Optional<GradingProblem> load(JobMessage message) {
        return jdbc.query(SQL, result -> {
            if (!result.next()) throw new IllegalArgumentException("Unknown grading job");
            String status = result.getString("status");
            if ("completed".equals(status) || "failed".equals(status)) return Optional.empty();
            if (!message.job_id().equals(result.getString("job_id"))) throw new IllegalArgumentException("Job mismatch");
            if (!message.question_id().equals(result.getLong("question_id"))
                    || !message.question_version_id().equals(result.getLong("question_version_id")))
                throw new IllegalArgumentException("Pinned question does not match job");
            String source = result.getString("source_code");
            String language = result.getString("language");
            if (source == null || source.getBytes(StandardCharsets.UTF_8).length > MAX_SOURCE_BYTES)
                throw new IllegalArgumentException("Invalid source size");
            String rawSnapshot = result.getString("snapshot");
            if (rawSnapshot == null || rawSnapshot.length() > 8 * 1024 * 1024)
                throw new IllegalArgumentException("Question snapshot too large");
            JsonNode snapshot;
            try { snapshot = json.readTree(rawSnapshot); }
            catch (java.io.IOException error) { throw new IllegalArgumentException("Invalid question snapshot", error); }
            JsonNode programming = snapshot.path("programming");
            String requested = message.language();
            if (!requested.equals(language) || !allows(programming.path("allowed_languages"), language))
                throw new IllegalArgumentException("Language does not match pinned question");
            int time = programming.path("time_limit_ms").asInt(5000);
            int memory = programming.path("memory_limit_mb").asInt(256);
            if (time < 100 || time > 30000 || memory < 32 || memory > 2048)
                throw new IllegalArgumentException("Invalid sandbox limits");
            var testNodes = snapshot.path("test_cases");
            if (!testNodes.isArray() || testNodes.isEmpty() || testNodes.size() > 200)
                throw new IllegalArgumentException("Invalid test set");
            var tests = new ArrayList<GradingProblem.TestCase>();
            long totalTestBytes = 0;
            for (JsonNode test : testNodes) {
                String input = requiredText(test, "input");
                String expected = requiredText(test, "expected_output");
                int inputBytes = input.getBytes(StandardCharsets.UTF_8).length;
                int outputBytes = expected.getBytes(StandardCharsets.UTF_8).length;
                if (inputBytes > MAX_TEST_BYTES || outputBytes > MAX_TEST_BYTES)
                    throw new IllegalArgumentException("Test case too large");
                totalTestBytes += (long) inputBytes + outputBytes;
                if (totalTestBytes > MAX_TOTAL_TEST_BYTES) throw new IllegalArgumentException("Test set too large");
                tests.add(new GradingProblem.TestCase(input, expected));
            }
            return Optional.of(new GradingProblem(message.job_id(), message.submission_id(), language,
                    source, time, memory, tests));
        }, message.job_id(), message.submission_id());
    }

    private String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) throw new IllegalArgumentException("Missing test " + field);
        return value.asText();
    }

    private boolean allows(JsonNode languages, String language) {
        if (!languages.isArray()) return false;
        for (JsonNode item : languages) if (language.equals(item.asText())) return true;
        return false;
    }
}
