package vn.lmsp;

import org.junit.jupiter.api.Test;
import vn.lmsp.model.User;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-CRS-04 / api-spec §1: ?q= + ?sort=field|-field whitelist cho mọi danh sách. */
class ListSearchSortTest extends ApiTestSupport {
    private String tail() { return UUID.randomUUID().toString().substring(0, 5); }
    private String msv() { return "SV" + UUID.randomUUID().toString().substring(0, 8); }

    private void createCourse(User lecturer, String code, String name) throws Exception {
        mockMvc.perform(auth(post("/api/v1/courses").contentType(APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\",\"name\":\"" + name + "\",\"credits\":3}"), lecturer))
                .andExpect(status().isCreated());
    }
    private long createClass(User lecturer, Long courseId, String semester) throws Exception {
        String body = "{\"course_id\":" + courseId + ",\"code\":\"LS" + tail() + "\",\"name\":\"Lớp sort\",\"semester\":\"" + semester
                + "\",\"lecturer_id\":" + lecturer.getId() + "}";
        return json.readTree(mockMvc.perform(auth(post("/api/v1/classes").contentType(APPLICATION_JSON).content(body), lecturer))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    @Test void coursesFilterByQ() throws Exception {
        Fixture f = classFixture();
        createCourse(f.lecturer(), "MANG" + tail(), "Mạng máy tính nâng cao");
        createCourse(f.lecturer(), "AI" + tail(), "Trí tuệ nhân tạo");
        mockMvc.perform(auth(get("/api/v1/courses").param("q", "mạng"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Mạng máy tính nâng cao"))
                .andExpect(jsonPath("$.items[0].credits").value(3));
    }
    @Test void coursesSortDescByCode() throws Exception {
        Fixture f = classFixture();
        createCourse(f.lecturer(), "ZA" + tail(), "Sort Zeta");
        createCourse(f.lecturer(), "AB" + tail(), "Sort Alpha");
        mockMvc.perform(auth(get("/api/v1/courses").param("q", "sort").param("sort", "-code"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].code", org.hamcrest.Matchers.startsWith("ZA")))
                .andExpect(jsonPath("$.items[1].code", org.hamcrest.Matchers.startsWith("AB")));
    }
    @Test void invalidSortFieldRejectedEverywhere() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(get("/api/v1/courses").param("sort", "password_hash"), f.lecturer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        mockMvc.perform(auth(get("/api/v1/classes").param("sort", "grade_policy"), f.lecturer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        mockMvc.perform(auth(get("/api/v1/classes/{id}/students", f.clazz().getId()).param("sort", "password_hash"), f.lecturer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        User admin = user("admin", null);
        mockMvc.perform(auth(get("/api/v1/users").param("sort", "email"), admin))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
    @Test void classesFilterBySemester() throws Exception {
        Fixture f = classFixture();
        long fall = createClass(f.lecturer(), f.course().getId(), "202610");
        createClass(f.lecturer(), f.course().getId(), "202620");
        mockMvc.perform(auth(get("/api/v1/classes").param("semester", "202610"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(fall));
    }
    @Test void classesFilterByQ() throws Exception {
        Fixture f = classFixture();
        String marker = "LSQ" + tail();
        String body = "{\"course_id\":" + f.course().getId() + ",\"code\":\"" + marker
                + "\",\"name\":\"Lớp tìm kiếm\",\"semester\":\"20261\",\"lecturer_id\":" + f.lecturer().getId() + "}";
        long created = json.readTree(mockMvc.perform(auth(post("/api/v1/classes").contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(auth(get("/api/v1/classes").param("q", marker), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(created))
                .andExpect(jsonPath("$.items[0].code").value(marker));
    }
    @Test void usersSortByFullNameAllowedForAdmin() throws Exception {
        User admin = user("admin", null);
        mockMvc.perform(auth(get("/api/v1/users").param("sort", "full_name"), admin))
                .andExpect(status().isOk());
        mockMvc.perform(auth(get("/api/v1/users").param("sort", "-last_login_at"), admin))
                .andExpect(status().isOk());
    }
    @Test void studentsSearchByCodeAndSort() throws Exception {
        Fixture f = classFixture();
        User svA = user("student", msv()), svB = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + svA.getStudentCode() + "\"},{\"student_code\":\"" + svB.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(get("/api/v1/classes/{id}/students", f.clazz().getId()).param("q", svA.getStudentCode()), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].user_id").value(svA.getId()));
        mockMvc.perform(auth(get("/api/v1/classes/{id}/students", f.clazz().getId()).param("sort", "-student_code"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2));
    }
    @Test void materialsFilterByTitle() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/materials", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"title\":\"Slide chương 1\",\"url\":\"https://example.com/s1\"}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/materials", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"title\":\"Bài tập tuần 1\",\"url\":\"https://example.com/bt1\"}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(get("/api/v1/classes/{id}/materials", f.clazz().getId()).param("q", "bài tập"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Bài tập tuần 1"));
    }
}
