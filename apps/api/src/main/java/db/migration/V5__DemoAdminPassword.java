package db.migration;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

public class V5__DemoAdminPassword extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws SQLException {
        var connection = context.getConnection();
        Long adminId = null;
        try (PreparedStatement find = connection.prepareStatement("SELECT id FROM users WHERE email = ?")) {
            find.setString(1, "admin@lms.local");
            try (ResultSet result = find.executeQuery()) {
                if (result.next()) adminId = result.getLong(1);
            }
        }
        if (adminId == null) return;

        String hash = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode("Demo@12345");
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")) {
            update.setString(1, hash);
            update.setLong(2, adminId);
            update.executeUpdate();
        }
        try (PreparedStatement revoke = connection.prepareStatement(
                "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL")) {
            revoke.setLong(1, adminId);
            revoke.executeUpdate();
        }
        try (PreparedStatement audit = connection.prepareStatement(
                "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, created_at) VALUES (NULL, ?, 'user', ?, CURRENT_TIMESTAMP)")) {
            audit.setString(1, "demo.admin.password_reset");
            audit.setLong(2, adminId);
            audit.executeUpdate();
        }
    }
}
