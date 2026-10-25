package vn.lmsp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.lmsp.model.Course;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.CourseRepository;
import vn.lmsp.repository.RoleRepository;
import vn.lmsp.repository.UserRepository;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Nền chung cho test API: MockMvc + H2 (profile "test"), fixture tạo trực tiếp qua repository. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {
    protected static final String PASSWORD = "Pass@12345";
    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository users;
    @Autowired protected RoleRepository roles;
    @Autowired protected CourseRepository courses;
    @Autowired protected ClassRepository classes;
    @Autowired protected PasswordEncoder passwords;

    protected User user(String role, String studentCode) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = (studentCode != null ? studentCode : role + "-" + suffix).toLowerCase() + "@test.local";
        return users.save(new User(email, passwords.encode(PASSWORD), "Người dùng " + suffix, studentCode,
                roles.findByName(role).orElseThrow(() -> new IllegalStateException("Thiếu role " + role))));
    }
    protected record Fixture(User lecturer, User student, User outsider, Course course, LmsClass clazz) { }
    protected Fixture classFixture() {
        User lecturer = user("lecturer", null);
        User student = user("student", "SV" + UUID.randomUUID().toString().substring(0, 8));
        User outsider = user("student", "SV" + UUID.randomUUID().toString().substring(0, 8));
        Course course = courses.save(new Course("KH" + UUID.randomUUID().toString().substring(0, 6), "Khóa học test", null, lecturer));
        LmsClass clazz = classes.save(new LmsClass(course, "LH" + UUID.randomUUID().toString().substring(0, 6), "Lớp học test", "20261", lecturer, null));
        return new Fixture(lecturer, student, outsider, course, clazz);
    }
    /** Đăng nhập lấy access token; ném lỗi kèm body nếu thất bại. */
    protected String accessToken(User user) throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"account\":\"" + user.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString();
        JsonNode token = json.readTree(body).path("access_token");
        if (token.isMissingNode() || token.asText().isBlank()) throw new IllegalStateException("Login thất bại: " + body);
        return token.asText();
    }
    protected MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder builder, User user) throws Exception {
        return builder.header("Authorization", "Bearer " + accessToken(user));
    }
}
