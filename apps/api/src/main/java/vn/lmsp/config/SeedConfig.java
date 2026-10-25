package vn.lmsp.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.lmsp.model.Role;
import vn.lmsp.model.User;
import vn.lmsp.repository.RoleRepository;
import vn.lmsp.repository.UserRepository;

@Configuration
public class SeedConfig {
    private static final String DEMO_PASSWORD = "Demo@12345";
    @Bean
    CommandLineRunner seedDemoUsers(UserRepository users, RoleRepository roles, PasswordEncoder passwords) {
        return args -> {
            createIfMissing(users, roles, passwords, "lecturer@lms.local", "Giảng viên Demo", null, "lecturer", "Giảng viên", DEMO_PASSWORD);
            createIfMissing(users, roles, passwords, "student@lms.local", "Sinh viên Demo", "SV000001", "student", "Sinh viên", DEMO_PASSWORD);
            createIfMissing(users, roles, passwords, "admin@lms.local", "Quản trị viên", null, "admin", "Quản trị viên", DEMO_PASSWORD);
        };
    }
    /** Role tự tạo nếu thiếu để seed chạy được cả khi khởi động schema trống (test H2). */
    private void createIfMissing(UserRepository users, RoleRepository roles, PasswordEncoder encoder,
                                 String email, String name, String code, String roleName, String roleDescription, String password) {
        if (users.findByEmailIgnoreCase(email).isPresent()) return;
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(new Role(roleName, roleDescription)));
        users.save(new User(email, encoder.encode(password), name, code, role));
    }
}
