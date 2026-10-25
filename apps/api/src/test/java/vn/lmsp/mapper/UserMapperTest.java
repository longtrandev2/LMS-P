package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.DomainFixtures.user;
import static vn.lmsp.support.DomainFixtures.role;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.junit.jupiter.api.Test;

class UserMapperTest {
    private final UserMapper mapper = new UserMapper();

    @Test
    void authenticationAndManagementUseTheSameRolesAndAvatarUrl() {
        var user = user(42, "student");
        user.setRoles(Set.of(role("student"), role("admin")));
        user.setAvatarPath("avatars/ảnh mới.png");
        user.updatePersonalProfile(null, "0123456789");

        var summary = mapper.toSummary(user);
        var view = mapper.toView(user);

        assertThat(summary.roles()).containsExactly("admin", "student");
        assertThat(view.roles()).isEqualTo(summary.roles());
        assertThat(view.avatar_url()).isEqualTo(summary.avatar_url())
                .startsWith("/users/42/avatar?v=").contains("%2F").doesNotContain(" ");
        assertThat(view.phone()).isEqualTo(summary.phone()).isEqualTo("0123456789");
    }

    @Test
    void publicJsonKeepsApiFieldNamesAndExcludesPersistenceSecrets() {
        var user = user(42, "student");
        var json = new ObjectMapper().valueToTree(mapper.toSummary(user));

        assertThat(json.properties()).extracting(java.util.Map.Entry::getKey).containsExactlyInAnyOrder(
                "id", "email", "full_name", "student_code", "phone", "avatar_url", "status", "roles");
        assertThat(json.toString()).doesNotContain("private-password-hash", "passwordHash", "avatarPath");
        assertThat(mapper.toSummary(user).avatar_url()).isNull();
        assertThat(mapper.toView(user).avatar_url()).isNull();
    }

    @Test
    void auditProjectionPreservesNullFieldsWithoutRecordingSecrets() {
        var user = user(42, "student");
        var audit = mapper.toAuditValue(user);

        assertThat(audit).containsEntry("phone", null)
                .containsEntry("status", "active").containsEntry("roles", java.util.List.of("student"))
                .doesNotContainKeys("password_hash", "passwordHash", "avatar_path");
    }
}
