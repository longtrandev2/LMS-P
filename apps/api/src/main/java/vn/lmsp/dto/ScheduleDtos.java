package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import vn.lmsp.enums.AttendanceStatus;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.enums.SessionMode;

/** Lịch học, điểm danh, đơn xin nghỉ — docs/api-spec.md §11. */
public final class ScheduleDtos {
    private ScheduleDtos() { }

    public record SessionInput(@NotNull LocalDate date,
                               @NotNull @Min(1) @Max(14) Integer start_period,
                               @NotNull @Min(1) @Max(14) Integer end_period,
                               @Size(max = 50) String room, SessionMode mode,
                               @Size(max = 200) String title, @Size(max = 5000) String note) { }

    /** Trường null = giữ nguyên; chuỗi rỗng ở room/title/note = xóa giá trị. */
    public record SessionPatch(LocalDate date, @Min(1) @Max(14) Integer start_period,
                               @Min(1) @Max(14) Integer end_period, @Size(max = 50) String room,
                               SessionMode mode, @Size(max = 200) String title, @Size(max = 5000) String note,
                               Boolean is_cancelled) { }

    public record WeeklyPattern(@NotNull @Min(1) @Max(7) Integer weekday,
                                @NotNull @Min(1) @Max(14) Integer start_period,
                                @NotNull @Min(1) @Max(14) Integer end_period,
                                @Size(max = 50) String room, SessionMode mode) { }

    public record GenerateInput(@NotNull LocalDate from, @NotNull LocalDate to,
                                @NotNull @Size(min = 1, max = 7) List<@Valid @NotNull WeeklyPattern> patterns,
                                Boolean replace_unmarked) { }

    public record GenerateResult(int created, int removed) { }

    public record SessionMaterial(Long id, String title, String type) { }

    public record SessionView(Long id, Long class_id, int session_no, LocalDate date, int start_period, int end_period,
                              LocalDateTime starts_at, LocalDateTime ends_at, String room, SessionMode mode,
                              String title, String note, boolean is_cancelled, LocalDateTime attendance_taken_at,
                              String lecturer_name, List<SessionMaterial> materials,
                              AttendanceStatus my_status, LeaveRequestView my_leave_request) { }

    public record SessionList(List<SessionView> items) { }

    public record LeaveRequestView(Long id, Long class_id, Long session_id, LocalDate session_date, int start_period,
                                   int end_period, Long student_id, String student_code, String full_name, String reason,
                                   String evidence_name, int evidence_size, LeaveRequestStatus status, String review_note,
                                   String reviewed_by_name, LocalDateTime reviewed_at, LocalDateTime created_at) { }

    public record LeaveReview(@NotNull LeaveRequestStatus status, @Size(max = 500) String review_note) { }

    public record AttendanceEntry(@NotNull Long student_id, @NotNull AttendanceStatus status,
                                  @Size(max = 255) String note) { }

    public record AttendanceUpdate(@NotNull @Size(min = 1, max = 1000) List<@Valid @NotNull AttendanceEntry> records) { }

    public record AttendanceItem(Long student_id, String student_code, String full_name, AttendanceStatus status,
                                 String note, LeaveRequestView leave_request) { }

    /** Thống kê của một buổi: total = số sinh viên đang học lớp. */
    public record SessionSummary(int total, int present, int late, int excused, int absent, int unmarked) { }

    public record AttendanceSheet(SessionView session, List<AttendanceItem> items, SessionSummary summary) { }

    /** Thống kê của sinh viên trong lớp: total = số buổi không hủy. */
    public record StudentAttendance(int total, int present, int late, int excused, int absent, int unmarked,
                                    int max_absences, boolean eligible) { }

    public record StudentAttendanceRow(Long student_id, String student_code, String full_name, int total, int present,
                                       int late, int excused, int absent, int unmarked, int max_absences,
                                       boolean eligible) { }

    public record ClassAttendanceSummary(int total_sessions, int taken_sessions, int max_absences,
                                         List<StudentAttendanceRow> items) { }

    public record Page<T>(List<T> items, long total, int page, int limit) { }
}
