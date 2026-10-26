package vn.lmsp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public final class AcademicsDtos {
    private AcademicsDtos() { }
    public record CourseInput(@Size(min=1,max=20) String code, @Size(min=1,max=200) String name, String description,
                              @Min(1) @Max(255) Integer credits) { }
    public record CourseView(Long id, String code, String name, String description, Integer credits,
                             Long created_by, LocalDateTime created_at) { }
    public record ClassInput(@NotNull Long course_id, @Size(min=1,max=30) String code,
                             @Size(min=1,max=200) String name, @Size(min=1,max=20) String semester,
                             Long lecturer_id, Long co_lecturer_id, @Min(1) Integer max_students,
                             @Size(max=50) String room, String status, JsonNode grade_policy) { }
    public record ClassPatch(@Size(min=1,max=30) String code, @Size(min=1,max=200) String name,
                             @Size(min=1,max=20) String semester, Long lecturer_id, Long co_lecturer_id,
                             @Min(1) Integer max_students, @Size(max=50) String room, String status,
                             JsonNode grade_policy) { }
    public record ClassView(Long id, Long course_id, String code, String name, String semester,
                            Long lecturer_id, Long co_lecturer_id, Integer max_students, String room,
                            String status, JsonNode grade_policy, LocalDateTime created_at,
                            String course_code, String course_name, String lecturer_name,
                            long enrolled_count, Integer seats_left) { }
    /** Một dòng ghi danh: đúng 1 trong student_id (legacy) / student_code / email. */
    public record EnrollRow(Long student_id, @Size(max=20) String student_code, @Size(max=255) String email) { }
    public record EnrollRequest(List<EnrollRow> students) { }
    public record RowError(int row, String code, String reason) { }
    public record EnrollOutcome(int added, List<RowError> errors) { }
    public record StudentView(Long user_id, String email, String full_name, String student_code,
                              String status, LocalDateTime enrolled_at) { }
    public record MyClassView(Long id, Long course_id, String code, String name, String semester,
                              Long lecturer_id, String status, String course_code, String course_name,
                              String lecturer_name) { }
    /** Buổi lẻ HOẶC lặp tuần (weekday 1=Thứ 2..7=CN, sinh repeat_weeks buổi kể từ repeat_from). */
    public record SessionInput(LocalDate session_date, @Min(1) @Max(7) Integer weekday,
                               @Min(1) @Max(12) int period_start, @Min(1) @Max(12) int period_end,
                               @Size(max=50) String room, String mode, String delivery,
                               @Size(max=200) String title, LocalDate repeat_from,
                               @Min(1) @Max(30) Integer repeat_weeks) { }
    public record SessionPatch(LocalDate session_date, @Min(1) @Max(12) Integer period_start,
                               @Min(1) @Max(12) Integer period_end, @Size(max=50) String room,
                               String mode, String delivery, @Size(max=200) String title) { }
    public record SessionView(Long id, Long class_id, String class_code, String class_name,
                              LocalDate session_date, int period_start, int period_end,
                              LocalTime start_time, LocalTime end_time, String room,
                              String mode, String delivery, String title) { }
    public record Page<T>(List<T> items, long total, int page, int limit) { }
}
