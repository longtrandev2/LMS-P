package vn.lmsp.dto;

import vn.lmsp.model.User;
import java.util.List;

public record UserSummary(Long id, String email, String full_name, String student_code, String phone,
                          String status, List<String> roles, String avatar_url) {
    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getStudentCode(), user.getPhone(),
                user.getStatus().name(), user.getRoles().stream().map(role -> role.getName()).sorted().toList(),
                user.getAvatarPath() == null ? null : "/api/v1/users/" + user.getId() + "/avatar");
    }
}
