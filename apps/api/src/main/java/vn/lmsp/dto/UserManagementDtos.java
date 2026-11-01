package vn.lmsp.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class UserManagementDtos {
    private UserManagementDtos() { }
    public record UserView(Long id,String email,String full_name,String student_code,String phone,String avatar_url,
                           String status,LocalDateTime last_login_at,LocalDateTime created_at,List<String> roles) { }
    public record ClassReference(Long id,String code,String name,String course_name,String semester) { }
    public record UserDetail(UserView user,List<ClassReference> enrolled_classes,List<ClassReference> teaching_classes) { }
    public record CreateUser(@Email @NotBlank String email,@NotBlank @Size(max=150) String full_name,
                             @Size(max=20) String student_code,@NotEmpty List<String> role_names,
                             @Size(min=8,max=128) String password) { }
    public record UpdateUser(@Size(min=1,max=150) String full_name,String student_code,
                             List<String> role_names,String status,@Size(max=500) String lock_reason,boolean reset_password) { }
    public record UpdateMe(@Size(min=1,max=150) String full_name,
                           @Pattern(regexp="[0-9+() .-]{0,20}") String phone,String old_password,
                           @Size(min=8,max=128) String new_password) { }
    public record UserWithTempPassword(UserView user,String temporary_password) { }
    public record Page<T>(List<T> items,long total,int page,int limit) { }
    public record ImportRowError(int row,String reason) { }
    public record DuplicateRow(int row,String email,String student_code) { }
    public record ImportPreview(int valid_rows,List<ImportRowError> errors,List<DuplicateRow> duplicates) { }
    public record TempPassword(String email,String temp_password) { }
    public record ImportResult(int created,List<String> skipped,List<ImportRowError> errors,List<TempPassword> temp_passwords) { }
}
