package vn.lmsp;

import org.junit.jupiter.api.Test;
import vn.lmsp.model.User;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** BR11–BR12: sĩ số tối đa, khóa lớp, max_students không được hạ dưới sĩ số hiện tại. */
class ClassCapacityTest extends ApiTestSupport {
    private String msv() { return "SV" + UUID.randomUUID().toString().substring(0, 8); }

    /** Tạo lớp qua API (kèm max_students) rồi trả về id. */
    private long classWithMax(Fixture f, int max) throws Exception {
        String body = "{\"course_id\":" + f.course().getId() + ",\"code\":\"CA" + UUID.randomUUID().toString().substring(0, 5)
                + "\",\"name\":\"Lớp sĩ số\",\"semester\":\"20261\",\"lecturer_id\":" + f.lecturer().getId()
                + ",\"max_students\":" + max + ",\"room\":\"A101\"}";
        return json.readTree(mockMvc.perform(auth(post("/api/v1/classes").contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }
    @Test void thirdStudentRejectedWhenFull() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 2);
        // 2 SV đầu: tạo trước 2 user rồi ghi danh theo mã
        User sv1 = user("student", msv()), sv2 = user("student", msv()), sv3 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv1.getStudentCode() + "\"},{\"student_code\":\"" + sv2.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.added").value(2));
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv3.getStudentCode() + "\"}"), f.lecturer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CLASS_FULL"));
    }
    @Test void raisingMaxAllowsThirdStudent() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 2);
        User sv1 = user("student", msv()), sv2 = user("student", msv()), sv3 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv1.getStudentCode() + "\"},{\"student_code\":\"" + sv2.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(patch("/api/v1/classes/{id}", classId).contentType(APPLICATION_JSON)
                .content("{\"max_students\":3}"), f.lecturer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.max_students").value(3));
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv3.getStudentCode() + "\"}"), f.lecturer()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.added").value(1));
    }
    @Test void loweringMaxBelowEnrolledRejected() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 2);
        User sv1 = user("student", msv()), sv2 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv1.getStudentCode() + "\"},{\"student_code\":\"" + sv2.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(patch("/api/v1/classes/{id}", classId).contentType(APPLICATION_JSON)
                .content("{\"max_students\":1}"), f.lecturer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
    @Test void lockedClassRejectsEnrollment() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 30);
        mockMvc.perform(auth(patch("/api/v1/classes/{id}", classId).contentType(APPLICATION_JSON)
                .content("{\"status\":\"locked\"}"), f.lecturer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("locked"));
        User sv = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv.getStudentCode() + "\"}"), f.lecturer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Lớp đã bị khóa"));
    }
    @Test void detailReportsEnrolledCountAndSeats() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 3);
        User sv1 = user("student", msv()), sv2 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv1.getStudentCode() + "\"},{\"student_code\":\"" + sv2.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(get("/api/v1/classes/{id}", classId), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolled_count").value(2))
                .andExpect(jsonPath("$.seats_left").value(1))
                .andExpect(jsonPath("$.room").value("A101"));
    }
    @Test void nullMaxMeansUnlimitedSeats() throws Exception {
        Fixture f = classFixture(); // fixture tạo lớp không giới hạn sĩ số
        mockMvc.perform(auth(get("/api/v1/classes/{id}", f.clazz().getId()), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.max_students").doesNotExist())
                .andExpect(jsonPath("$.seats_left").doesNotExist());
    }
    @Test void bulkEnrollReportsFullAsRowError() throws Exception {
        Fixture f = classFixture();
        long classId = classWithMax(f, 1);
        User sv1 = user("student", msv()), sv2 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", classId).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv1.getStudentCode() + "\"},{\"student_code\":\"" + sv2.getStudentCode() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(1))
                .andExpect(jsonPath("$.errors[0].row").value(2))
                .andExpect(jsonPath("$.errors[0].code").value("CLASS_FULL"));
    }
}
