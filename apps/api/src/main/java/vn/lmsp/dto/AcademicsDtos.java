package vn.lmsp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.time.LocalDateTime;
import vn.lmsp.enums.ClassStatus;

public final class AcademicsDtos {
    private AcademicsDtos() { }
    public record CourseInput(@Size(min=1,max=20) String code, @Size(min=1,max=200) String name, String description) { }
    public record CourseView(Long id, String code, String name, String description, Long created_by, LocalDateTime created_at) { }
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
                            ClassStatus status, long enrolled_count, Integer seats_left) { }
    public record EnrollTarget(Long student_id, String student_code, String email) { }
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
    public record MyClassView(Long id, Long course_id, String code, String name, String semester,
                              Long lecturer_id, String status, String course_code, String course_name,
                              String lecturer_name) { }
    public record Page<T>(List<T> items, long total, int page, int limit) { }
}
