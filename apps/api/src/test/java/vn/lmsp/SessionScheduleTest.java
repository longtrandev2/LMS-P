package vn.lmsp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.lmsp.model.Enrollment;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-CRS-05..07: buổi học, lặp tuần, quy đổi tiết → giờ, khóa sửa buổi đã diễn ra, lịch cá nhân/giảng dạy. */
class SessionScheduleTest extends ApiTestSupport {
    private static final String FUTURE = "2027-01-04"; // Thứ 2
    @Autowired protected EnrollmentRepository enrollments;
    @Autowired protected ClassSessionRepository sessions;

    private String createSession(Long classId, User actor, String body) throws Exception {
        return mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", classId).contentType(APPLICATION_JSON).content(body), actor))
                .andReturn().getResponse().getContentAsString();
    }

    @Test void weeklyRepeatCreatesThreeSessions() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"weekday\":1,\"period_start\":1,\"period_end\":2,\"repeat_from\":\"" + FUTURE + "\",\"repeat_weeks\":3,\"room\":\"B202\",\"title\":\"Lý thuyết mạng\"}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].session_date").value("2027-01-04"))
                .andExpect(jsonPath("$[1].session_date").value("2027-01-11"))
                .andExpect(jsonPath("$[2].session_date").value("2027-01-18"))
                .andExpect(jsonPath("$[0].start_time").value("07:00:00"))
                .andExpect(jsonPath("$[0].end_time").value("08:40:00"))
                .andExpect(jsonPath("$[0].class_code").value(f.clazz().getCode()))
                .andExpect(jsonPath("$[0].mode").value("ly_thuyet"));
    }
    @Test void repeatStartsAtFirstMatchingWeekday() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"weekday\":2,\"period_start\":3,\"period_end\":3,\"repeat_from\":\"" + FUTURE + "\",\"repeat_weeks\":1}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].session_date").value("2027-01-05")) // Thứ 3 đầu tiên kể từ 04/01
                .andExpect(jsonPath("$[0].start_time").value("08:50:00"))
                .andExpect(jsonPath("$[0].end_time").value("09:35:00"));
    }
    @Test void singleSessionAndPatchRoom() throws Exception {
        Fixture f = classFixture();
        long sid = json.readTree(createSession(f.clazz().getId(), f.lecturer(),
                "{\"session_date\":\"2027-02-01\",\"period_start\":7,\"period_end\":8,\"room\":\"C101\",\"mode\":\"thuc_hanh\",\"delivery\":\"truc_tuyen\"}"))
                .get(0).get("id").asLong();
        mockMvc.perform(auth(patch("/api/v1/classes/{id}/sessions/{sid}", f.clazz().getId(), sid).contentType(APPLICATION_JSON)
                .content("{\"room\":\"D303\",\"period_start\":1,\"period_end\":2}"), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room").value("D303"))
                .andExpect(jsonPath("$.start_time").value("07:00:00"))
                .andExpect(jsonPath("$.mode").value("thuc_hanh"))
                .andExpect(jsonPath("$.delivery").value("truc_tuyen"));
    }
    @Test void invalidPeriodRangeRejected() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"session_date\":\"" + FUTURE + "\",\"period_start\":5,\"period_end\":2}"), f.lecturer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"session_date\":\"" + FUTURE + "\",\"period_start\":1,\"period_end\":13}"), f.lecturer()))
                .andExpect(status().isBadRequest());
    }
    @Test void repeatWeeksCappedAtThirty() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"weekday\":1,\"period_start\":1,\"period_end\":2,\"repeat_from\":\"" + FUTURE + "\",\"repeat_weeks\":31}"), f.lecturer()))
                .andExpect(status().isBadRequest());
    }
    @Test void pastSessionCannotBePatchedOrDeleted() throws Exception {
        Fixture f = classFixture();
        long sid = json.readTree(createSession(f.clazz().getId(), f.lecturer(),
                "{\"session_date\":\"2020-01-01\",\"period_start\":1,\"period_end\":1}")).get(0).get("id").asLong();
        mockMvc.perform(auth(patch("/api/v1/classes/{id}/sessions/{sid}", f.clazz().getId(), sid).contentType(APPLICATION_JSON)
                .content("{\"room\":\"X\"}"), f.lecturer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Buổi học đã diễn ra, không thể sửa"));
        mockMvc.perform(auth(delete("/api/v1/classes/{id}/sessions/{sid}", f.clazz().getId(), sid), f.lecturer()))
                .andExpect(status().isConflict());
    }
    @Test void studentScheduleMergesClasses() throws Exception {
        Fixture f = classFixture();
        User sv = user("student", "SV" + UUID.randomUUID().toString().substring(0, 8));
        enrollments.save(new Enrollment(f.clazz(), sv));
        // Lớp thứ 2 cùng SV
        String body = "{\"course_id\":" + f.course().getId() + ",\"code\":\"HK" + UUID.randomUUID().toString().substring(0, 5)
                + "\",\"name\":\"Lớp lịch 2\",\"semester\":\"20261\",\"lecturer_id\":" + f.lecturer().getId() + "}";
        long class2 = json.readTree(mockMvc.perform(auth(post("/api/v1/classes").contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        enrollments.save(new Enrollment(classes.findById(class2).orElseThrow(), sv));
        createSession(f.clazz().getId(), f.lecturer(), "{\"session_date\":\"2027-01-05\",\"period_start\":1,\"period_end\":1}");
        createSession(class2, f.lecturer(), "{\"session_date\":\"2027-01-06\",\"period_start\":7,\"period_end\":7}");
        mockMvc.perform(auth(get("/api/v1/me/schedule").param("from", "2027-01-01").param("to", "2027-01-31"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].session_date").value("2027-01-05"))
                .andExpect(jsonPath("$[1].session_date").value("2027-01-06"));
        // SV không ghi danh lớp khác → không thấy buổi của lớp đó
        User outsider = user("student", "SV" + UUID.randomUUID().toString().substring(0, 8));
        mockMvc.perform(auth(get("/api/v1/me/schedule").param("from", "2027-01-01").param("to", "2027-01-31"), outsider))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
    @Test void outsiderCannotListClassSessions() throws Exception {
        Fixture f = classFixture();
        createSession(f.clazz().getId(), f.lecturer(), "{\"session_date\":\"" + FUTURE + "\",\"period_start\":1,\"period_end\":1}");
        mockMvc.perform(auth(get("/api/v1/classes/{id}/sessions", f.clazz().getId()), f.outsider()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }
    @Test void enrolledStudentListsClassSessions() throws Exception {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        createSession(f.clazz().getId(), f.lecturer(), "{\"session_date\":\"" + FUTURE + "\",\"period_start\":1,\"period_end\":1}");
        mockMvc.perform(auth(get("/api/v1/classes/{id}/sessions", f.clazz().getId())
                .param("from", "2027-01-01").param("to", "2027-01-31"), f.student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].class_code").value(f.clazz().getCode()));
    }
    @Test void teachingScheduleIncludesCoLecturerClasses() throws Exception {
        Fixture f = classFixture();
        User coLecturer = user("lecturer", null);
        String body = "{\"course_id\":" + f.course().getId() + ",\"code\":\"CO" + UUID.randomUUID().toString().substring(0, 5)
                + "\",\"name\":\"Lớp đồng phụ trách\",\"semester\":\"20261\",\"lecturer_id\":" + f.lecturer().getId()
                + ",\"co_lecturer_id\":" + coLecturer.getId() + "}";
        long class2 = json.readTree(mockMvc.perform(auth(post("/api/v1/classes").contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        createSession(class2, coLecturer, "{\"session_date\":\"2027-01-07\",\"period_start\":7,\"period_end\":8}");
        mockMvc.perform(auth(get("/api/v1/me/teaching-schedule").param("from", "2027-01-01").param("to", "2027-01-31"), coLecturer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].class_name").value("Lớp đồng phụ trách"));
    }
    @Test void studentCannotCreateSessions() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/sessions", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"session_date\":\"" + FUTURE + "\",\"period_start\":1,\"period_end\":1}"), f.student()))
                .andExpect(status().isForbidden());
    }
}
