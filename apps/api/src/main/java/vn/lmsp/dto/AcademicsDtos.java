package vn.lmsp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.time.LocalDateTime;
import vn.lmsp.enums.ClassStatus;

public final class AcademicsDtos {
    private AcademicsDtos() { }
    /** credits 1–10; bỏ trống khi tạo = 3 (class-schedule-grades-spec §1). */
    public record CourseInput(@Size(min=1,max=20) String code, @Size(min=1,max=200) String name, String description,
                              @Min(1) @Max(10) Integer credits) { }
    public record CourseView(Long id, String code, String name, String description, int credits, Long created_by, LocalDateTime created_at) { }
    public record ClassInput(@NotNull Long course_id, @Size(min=1,max=30) String code,
                             @Size(min=1,max=200) String name, @Size(min=1,max=20) String semester,
                             @NotNull Long lecturer_id, JsonNode grade_policy, Integer max_students,
                             LocalDateTime enroll_from, LocalDateTime enroll_until, String room,
                             String schedule, ClassStatus status) { }
    public record ClassPatch(@Size(min=1,max=30) String code, @Size(min=1,max=200) String name,
                             @Size(min=1,max=20) String semester, Long lecturer_id, JsonNode grade_policy,
                             Integer max_students, LocalDateTime enroll_from, LocalDateTime enroll_until,
                             String room, String schedule, ClassStatus status, Boolean clear_capacity,
                             Boolean clear_enroll_from, Boolean clear_enroll_until) { }
    public record ClassView(Long id, Long course_id, String code, String name, String semester,
                            Long lecturer_id, JsonNode grade_policy, LocalDateTime created_at,
                            String course_code, String course_name, String lecturer_name, Integer max_students,
                            LocalDateTime enroll_from, LocalDateTime enroll_until, String room, String schedule,
                            ClassStatus status, long enrolled_count, Integer seats_left, int credits) { }
    public record EnrollTarget(Long studentId) { }
    public record EnrollIdsRequest(@NotNull @Size(min=1, max=500) List<@NotNull @Positive Long> student_ids) { }
    public record CsvEnrollTarget(int row, String student_code, String email) { }
    public record CsvEnrollRequest(@NotNull @Size(min=1, max=1000) List<CsvEnrollTarget> students) { }
    public record EnrollPreviewRow(int row, String identifier, Long user_id, String full_name, String email,
                                   String student_code, boolean valid, String code, String reason) { }
    public record EnrollPreview(int eligible, List<EnrollPreviewRow> rows) { }
    public record EnrollError(int row, String code, String reason) { }
    public record EnrollResult(int added, List<EnrollError> errors) { }
    public record StudentView(Long user_id, String email, String full_name, String student_code,
                              String status, LocalDateTime enrolled_at) { }
    public record StudentCandidateView(Long user_id, String email, String full_name, String student_code) { }
    /** Thẻ lớp của sinh viên — class-schedule-grades-spec §6. */
    public record MyClassView(Long id, Long course_id, String code, String name, String semester,
                              Long lecturer_id, String status, String course_code, String course_name,
                              String lecturer_name, int credits, long total_sessions, long held_sessions,
                              long attended_sessions, LocalDateTime next_session_at, long materials_count,
                              long open_assignments_count, String lecturer_avatar_url) { }
    /** Số liệu thẻ lớp tính bằng truy vấn gộp (ClassCardQueries). */
    public record ClassCardStats(long totalSessions, long heldSessions, long attendedSessions,
                                 LocalDateTime nextSessionAt, long materialsCount, long openAssignmentsCount) {
        public static final ClassCardStats EMPTY = new ClassCardStats(0, 0, 0, null, 0, 0);
    }
    public record Page<T>(List<T> items, long total, int page, int limit) { }
}
