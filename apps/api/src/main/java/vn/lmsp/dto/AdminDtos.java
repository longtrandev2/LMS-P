package vn.lmsp.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.lmsp.enums.AnnouncementAudience;

/** Quản trị, vận hành — docs/admin-spec.md, docs/api-spec.md §9. */
public final class AdminDtos {
    private AdminDtos() { }

    // ---- Cấu hình (§1) ----
    public record UserRef(Long id, String full_name) { }
    public record SettingView(String key, JsonNode value, JsonNode default_value, String description, UserRef updated_by,
                              LocalDateTime updated_at) { }
    public record SettingsView(List<SettingView> items) { }
    public record SettingsUpdate(@NotEmpty @Size(max = 20) Map<@NotBlank String, JsonNode> values, @Size(max = 500) String reason) { }
    public record MaintenanceView(boolean enabled, String message) { }
    public record PublicSettings(List<String> allowed_languages, int default_time_limit_ms, int default_memory_limit_mb,
                                 int max_time_limit_ms, int max_memory_limit_mb, int max_upload_mb,
                                 int leave_evidence_max_mb, int inactivity_timeout_minutes, MaintenanceView maintenance) { }

    // ---- Thống kê (§2) ----
    public record UserTotals(long student, long lecturer, long admin, long locked) { }
    public record Totals(UserTotals users, long active_classes, long submissions_today, long sessions_in_progress) { }
    public record DailyStat(LocalDate date, long submissions_objective, long submissions_code, long new_users,
                            Long grading_avg_ms, Long grading_p95_ms) { }
    public record TopClass(Long class_id, String code, String name, long submissions) { }
    /** `verdicts` gồm các verdict chấm code + khóa `failed`. */
    public record StatsView(LocalDateTime generated_at, int days, Totals totals, List<DailyStat> daily,
                            Map<String, Long> verdicts, List<TopClass> top_classes) { }

    // ---- Hàng đợi, realtime (§3) ----
    public record QueueStat(String name, long messages, long consumers) { }
    public record QueueHealth(List<QueueStat> queues, LocalDateTime checked_at) { }
    public record OnlineUsers(long student, long lecturer, long admin, long total) { }
    public record RealtimeView(long ws_connections, long ws_users, OnlineUsers online_users, long workers,
                               LocalDateTime checked_at) { }

    // ---- Job chấm lỗi (§4) ----
    public record FailedSubmission(Long submission_id, Long assignment_id, String assignment_title, String class_code,
                                   String student_full_name, String student_code, String language,
                                   LocalDateTime submitted_at, String error_message, int grading_attempts) { }
    public record FailedPage(List<FailedSubmission> items, long total, int page, int limit) { }
    public record BulkRegradeInput(@Size(max = 500) List<@NotNull Long> submission_ids, Boolean all_failed,
                                   @NotBlank @Size(max = 500) String reason) { }
    public record BulkRegradeResult(int queued, int skipped) { }
    public record PurgeInput(@NotBlank @Size(max = 500) String reason) { }
    public record PurgeResult(long purged) { }

    // ---- Thông báo hệ thống (§5.1) ----
    public record AnnouncementInput(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 2000) String body,
                                    @NotNull AnnouncementAudience audience, @Size(max = 20) String role, Long class_id) { }
    public record AnnouncementCreated(Long id, int recipient_count) { }
    public record AnnouncementView(Long id, String title, String body, AnnouncementAudience audience, String role,
                                   Long class_id, String class_code, int recipient_count, UserRef created_by,
                                   LocalDateTime created_at) { }
    public record AnnouncementPage(List<AnnouncementView> items, long total, int page, int limit) { }

    // ---- Phiên đăng nhập (§6) ----
    public record LoginSessionView(String family, String ip, String user_agent, LocalDateTime created_at,
                                   LocalDateTime last_used_at, LocalDateTime expires_at) { }
}
