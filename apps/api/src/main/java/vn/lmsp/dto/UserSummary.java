package vn.lmsp.dto;

import vn.lmsp.model.User;
import java.util.List;

public record UserSummary(Long id, String email, String full_name, String student_code, String status, List<String> roles) {
    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getStudentCode(),
                user.getStatus().name(), user.getRoles().stream().map(role -> role.getName()).sorted().toList());
    }
}
