package vn.lmsp.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Đọc job chấm bài nộp, code và snapshot đã ghim (worker chỉ có quyền SELECT). */
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
    private static final int MAX_SNAPSHOT_CHARS = 8 * 1024 * 1024;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public GradingJobReader(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Rỗng nếu submission đã ở trạng thái cuối (ACK bỏ qua); job/snapshot không hợp lệ ném lỗi. */
    public Optional<GradingProblem> load(JobMessage message) {
        return jdbc.query(SQL, result -> {
            if (!result.next()) throw new IllegalArgumentException("Unknown grading job");
            String status = result.getString("status");
            if ("completed".equals(status) || "failed".equals(status)) return Optional.empty();
            if (!message.job_id().equals(result.getString("job_id"))) throw new IllegalArgumentException("Job mismatch");
            if (!message.question_id().equals(result.getLong("question_id"))
                    || !message.question_version_id().equals(result.getLong("question_version_id")))
                throw new IllegalArgumentException("Pinned question does not match job");
            String language = result.getString("language");
            if (!message.language().equals(language))
                throw new IllegalArgumentException("Language does not match submission");
            String rawSnapshot = result.getString("snapshot");
            if (rawSnapshot == null || rawSnapshot.length() > MAX_SNAPSHOT_CHARS)
                throw new IllegalArgumentException("Question snapshot too large");
            JsonNode snapshot;
            try { snapshot = json.readTree(rawSnapshot); }
            catch (java.io.IOException error) { throw new IllegalArgumentException("Invalid question snapshot", error); }
            var request = SnapshotParser.parse(snapshot, language, result.getString("source_code"));
            return Optional.of(new GradingProblem(message.job_id(), message.submission_id(), request));
        }, message.job_id(), message.submission_id());
    }
}
