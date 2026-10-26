package vn.lmsp.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class UserManagementDtos {
    private UserManagementDtos() { }
    public record UserView(Long id,String email,String full_name,String student_code,String phone,String status,
                           LocalDateTime last_login_at,LocalDateTime created_at,List<String> roles,String avatar_url) { }
    public record CreateUser(@Email @NotBlank String email,@NotBlank @Size(max=150) String full_name,
                             @Size(max=20) String student_code,@NotEmpty List<String> role_names,
                             @Size(min=8,max=128) String password) { }
    public record UpdateUser(@Size(min=1,max=150) String full_name,String student_code,
                             List<String> role_names,String status,boolean reset_password) { }
    public record UpdateMe(@Size(min=1,max=150) String full_name,@Size(max=20) String phone,
                           String current_password,@Size(min=8,max=128) String new_password) { }
    public record UserWithTempPassword(UserView user,String temporary_password) { }
    public record Page<T>(List<T> items,long total,int page,int limit) { }
    public record ImportRowError(int row,String reason) { }
    public record TempPassword(String email,String temp_password) { }
    public record ImportResult(int created,List<String> skipped,List<ImportRowError> errors,List<TempPassword> temp_passwords) { }
}
