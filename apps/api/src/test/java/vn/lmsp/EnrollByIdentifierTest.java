package vn.lmsp;

import org.junit.jupiter.api.Test;
import vn.lmsp.model.User;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** api-spec §3 (BR11): ghi danh theo mã SV/email, lỗi theo dòng; ghi danh 1 chiều — SV không tự ghi danh. */
class EnrollByIdentifierTest extends ApiTestSupport {
    private String msv() { return "SV" + UUID.randomUUID().toString().substring(0, 8); }

    @Test void singleByStudentCodeAddsOne() throws Exception {
        Fixture f = classFixture();
        User sv = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv.getStudentCode() + "\"}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(1));
        mockMvc.perform(auth(get("/api/v1/classes/{id}/students", f.clazz().getId()), f.lecturer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].student_code").value(sv.getStudentCode()));
    }
    @Test void bulkByEmailAddsAll() throws Exception {
        Fixture f = classFixture();
        User sv1 = user("student", msv()), sv2 = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"email\":\"" + sv1.getEmail() + "\"},{\"email\":\"" + sv2.getEmail() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(2))
                .andExpect(jsonPath("$.errors.length()").value(0));
    }
    @Test void unknownCodeReportsRowError() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"KHONG-TON-TAI\"}]}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(0))
                .andExpect(jsonPath("$.errors[0].row").value(1))
                .andExpect(jsonPath("$.errors[0].code").value("ENROLLMENT_INVALID"));
    }
    @Test void duplicateReportsAlreadyEnrolled() throws Exception {
        Fixture f = classFixture();
        User sv = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv.getStudentCode() + "\"}"), f.lecturer()))
                .andExpect(status().isCreated());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + sv.getStudentCode().toLowerCase() + "\"}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(0))
                .andExpect(jsonPath("$.errors[0].code").value("ALREADY_ENROLLED"));
    }
    @Test void mixedRowsCountedPerRow() throws Exception {
        Fixture f = classFixture();
        User sv = user("student", msv());
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"student_code\":\"" + sv.getStudentCode() + "\"},{\"student_code\":\"SAI-MA\"}]}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(1))
                .andExpect(jsonPath("$.errors[0].row").value(2))
                .andExpect(jsonPath("$.errors[0].code").value("ENROLLMENT_INVALID"));
    }
    @Test void nonStudentAccountIsInvalidRow() throws Exception {
        Fixture f = classFixture();
        User gv = user("lecturer", null);
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"students\":[{\"email\":\"" + gv.getEmail() + "\"}]}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(0))
                .andExpect(jsonPath("$.errors[0].code").value("ENROLLMENT_INVALID"));
    }
    @Test void legacyStudentIdArrayStillWorks() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("[{\"student_id\":" + f.student().getId() + "}]"), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(1));
    }
    @Test void studentCannotEnrollAnyone() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId()).contentType(APPLICATION_JSON)
                .content("{\"student_code\":\"" + msv() + "\"}"), f.student()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }
}
