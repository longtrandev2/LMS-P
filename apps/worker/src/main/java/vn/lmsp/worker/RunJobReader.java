package vn.lmsp.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Đọc `run_jobs` theo `job_id = run_id`; chỉ job `pending` mới được chạy (worker chỉ SELECT). */
@Repository
public class RunJobReader {
    private static final String SQL = "SELECT status, payload FROM run_jobs WHERE job_id = ?";
    private static final int MAX_PAYLOAD_CHARS = 8 * 1024 * 1024;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public RunJobReader(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Rỗng nếu job không còn `pending` (ACK bỏ qua); không có job hoặc payload hỏng ném lỗi. */
    public Optional<ExecutionRequest> load(String runId) {
        return jdbc.query(SQL, result -> {
            if (!result.next()) throw new IllegalArgumentException("Unknown run job");
            if (!"pending".equals(result.getString("status"))) return Optional.empty();
            String raw = result.getString("payload");
            if (raw == null || raw.length() > MAX_PAYLOAD_CHARS) throw new IllegalArgumentException("Run payload too large");
            try { return Optional.of(RunPayloadParser.parse(json.readTree(raw))); }
            catch (java.io.IOException error) { throw new IllegalArgumentException("Invalid run payload", error); }
        }, runId);
    }
}
