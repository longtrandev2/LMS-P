package vn.lmsp.mapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.UserManagementDtos.UserView;
import vn.lmsp.dto.UserSummary;
import vn.lmsp.model.Role;
import vn.lmsp.model.User;

@Component
public class UserMapper {
    public UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getStudentCode(),
                user.getPhone(), avatarUrl(user), user.getStatus().name(), roleNames(user));
    }

    public UserView toView(User user) {
        return new UserView(user.getId(), user.getEmail(), user.getFullName(), user.getStudentCode(),
                user.getPhone(), avatarUrl(user), user.getStatus().name(), user.getLastLoginAt(),
                user.getCreatedAt(), roleNames(user));
    }

    public Map<String, Object> toAuditValue(User user) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("full_name", user.getFullName());
        value.put("student_code", user.getStudentCode());
        value.put("phone", user.getPhone());
        value.put("status", user.getStatus().name());
        value.put("roles", roleNames(user));
        return value;
    }

    private List<String> roleNames(User user) {
        return user.getRoles().stream().map(Role::getName).sorted().toList();
    }

    private String avatarUrl(User user) {
        return user.getAvatarPath() == null ? null : "/users/" + user.getId() + "/avatar?v="
                + URLEncoder.encode(user.getAvatarPath(), StandardCharsets.UTF_8);
    }
}
