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
            createIfMissing(users, roles, passwords, "lecturer@lms.local", "Giảng viên Demo", null, "lecturer", DEMO_PASSWORD);
            createIfMissing(users, roles, passwords, "student@lms.local", "Sinh viên Demo", "SV000001", "student", DEMO_PASSWORD);
            createIfMissing(users, roles, passwords, "admin@lms.local", "Quản trị viên", null, "admin", DEMO_PASSWORD);
        };
    }
    private boolean createIfMissing(UserRepository users, RoleRepository roles, PasswordEncoder encoder,
                                    String email, String name, String code, String roleName, String password) {
        if (users.findByEmailIgnoreCase(email).isPresent()) return false;
        Role role = roles.findByName(roleName).orElseThrow(() -> new IllegalStateException("Missing role " + roleName));
        users.save(new User(email, encoder.encode(password), name, code, role));
        return true;
    }
}
