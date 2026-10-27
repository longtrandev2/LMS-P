package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
import vn.lmsp.dto.QuestionContentDtos.AnswerInput;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.enums.SubmitReason;

/** Phiên làm bài và giám sát — docs/api-spec.md §7, docs/exam-spec.md §5, §7. */
public final class AttemptSessionDtos {
    private AttemptSessionDtos() { }

    // ---- Request ----

    public record StartSessionInput(Boolean accept_rules) { }

    /** Code ≤ 128 KiB (kiểm tra theo byte UTF-8 ở service); được phép rỗng. */
    public record CodeDraft(@NotBlank @Size(max = 20) String language, @NotNull String source_code) { }

    /**
     * Một câu cần lưu: `answer` (câu khách quan, `assessment-spec.md` §3.2, `answer.question_id` bị bỏ qua) hoặc `code`.
     * Không có cả hai = xóa câu trả lời đã lưu.
     */
    public record SessionAnswerInput(@NotNull Long question_id, @Valid AnswerInput answer, @Valid CodeDraft code) { }

    public record SaveAnswersInput(@NotNull @Size(max = 50) List<@NotNull @Valid SessionAnswerInput> answers) { }

    public record FinishInput(@Size(max = 50) List<@NotNull @Valid SessionAnswerInput> answers) { }

    /** Chỉ các loại trong {@link SessionEventType#CLIENT}. */
    public record SessionEventInput(@NotNull SessionEventType type, @Size(max = 10) Map<String, Object> detail) { }

    public record ExtendInput(@NotNull @Min(1) @Max(120) Integer minutes, @NotBlank @Size(max = 500) String reason) { }

    public record ForceSubmitInput(@NotBlank @Size(max = 500) String reason) { }

    // ---- Response ----

    /** Đồng hồ server — client hiệu chỉnh đếm ngược. `saved_at` chỉ có khi lưu; `focus_lost_count` chỉ có khi gửi sự kiện. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SessionClock(LocalDateTime saved_at, LocalDateTime server_now, LocalDateTime ends_at,
                               long remaining_seconds, Integer focus_lost_count) {
        public SessionClock {
            saved_at = millis(saved_at);
            server_now = millis(server_now);
        }
    }

    /** `attempt` chỉ có sau khi nộp (điểm/điểm từng câu theo chính sách xem lại như quiz). */
    public record AttemptSessionSummary(Long id, Long assignment_id, int attempt_no, AttemptSessionStatus status,
            String paper_code, LocalDateTime started_at, LocalDateTime ends_at, LocalDateTime server_now,
            long remaining_seconds, LocalDateTime submitted_at, SubmitReason submit_reason, int focus_lost_count,
            QuizAttemptView attempt) {
        public AttemptSessionSummary { server_now = millis(server_now); }
    }

    public record SessionSection(String title, List<AssignmentQuestionView> questions) { }

    public record SavedAnswer(Long question_id, AnswerResponse response, String language, String source_code,
                              LocalDateTime updated_at) { }

    /** Phiên đã nộp: `sections` và `answers` rỗng. */
    public record AttemptSessionView(AttemptSessionSummary session, String title, AssignmentCategory category,
            Integer time_limit_minutes, String rules_text, BigDecimal total_points, List<SessionSection> sections,
            List<SavedAnswer> answers) { }

    public record SessionEventView(SessionEventType type, LocalDateTime occurred_at, Map<String, Object> detail) { }

    // ---- Giám sát (exam-spec.md §7) ----

    public enum MonitorStatus { not_started, in_progress, submitted }

    public record MonitorSummary(int total, int not_started, int in_progress, int submitted, int offline) { }

    public record MonitorRow(Long student_id, String student_full_name, String student_code, Long session_id,
            MonitorStatus status, Integer attempt_no, String paper_code, LocalDateTime started_at, LocalDateTime ends_at,
            Long remaining_seconds, int answered_count, int question_count, int focus_lost_count,
            LocalDateTime last_seen_at, boolean online, SubmitReason submit_reason, BigDecimal score,
            BigDecimal max_score, boolean grading_pending) { }

    public record MonitorTable(LocalDateTime server_now, MonitorSummary summary, List<MonitorRow> items) {
        public MonitorTable { server_now = millis(server_now); }
    }

    /** Giờ server gửi client làm tròn tới mili giây (Date của JS không đọc được nano giây). */
    private static LocalDateTime millis(LocalDateTime value) {
        return value == null ? null : value.truncatedTo(ChronoUnit.MILLIS);
    }
}
