package vn.lmsp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;

public final class AcademicsDtos {
    private AcademicsDtos() { }
    public record CourseInput(@Size(min=1,max=20) String code, @Size(min=1,max=200) String name, String description) { }
    public record CourseView(Long id, String code, String name, String description, Long created_by, LocalDateTime created_at) { }
    public record ClassInput(@NotNull Long course_id, @Size(min=1,max=30) String code,
                             @Size(min=1,max=200) String name, @Size(min=1,max=20) String semester,
                             @NotNull Long lecturer_id, JsonNode grade_policy) { }
    public record ClassPatch(@Size(min=1,max=30) String code, @Size(min=1,max=200) String name,
                             @Size(min=1,max=20) String semester, Long lecturer_id, JsonNode grade_policy) { }
    public record ClassView(Long id, Long course_id, String code, String name, String semester,
                            Long lecturer_id, JsonNode grade_policy, LocalDateTime created_at,
                            String course_code, String course_name, String lecturer_name) { }
    public record EnrollItem(@NotNull Long student_id) { }
    public record StudentView(Long user_id, String email, String full_name, String student_code,
                              String status, LocalDateTime enrolled_at) { }
    public record MyClassView(Long id, Long course_id, String code, String name, String semester,
                              Long lecturer_id, String status, String course_code, String course_name,
                              String lecturer_name) { }
    public record Page<T>(List<T> items, long total, int page, int limit) { }
}
