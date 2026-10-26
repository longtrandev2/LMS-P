package vn.lmsp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.lmsp.model.Enrollment;
import vn.lmsp.repository.EnrollmentRepository;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-AUTH-04 (RBAC ở backend) + FR-CRS-02/03: ghi danh 1 chiều, kiểm soát truy cập theo ghi danh. */
class RbacEnrollmentTest extends ApiTestSupport {
    @Autowired protected EnrollmentRepository enrollments;

    @Test void courseEndpointsRequireToken() throws Exception {
        mockMvc.perform(post("/api/v1/courses").contentType(APPLICATION_JSON).content("{\"code\":\"X\",\"name\":\"Y\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void studentCannotCreateCourse() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(post("/api/v1/courses").contentType(APPLICATION_JSON)
                .content("{\"code\":\"MID\",\"name\":\"Mạng máy tính\"}"), f.student()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }
    @Test void studentCannotListClasses() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(get("/api/v1/classes"), f.student())).andExpect(status().isForbidden());
    }
    @Test void outsiderStudentCannotViewClass() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(get("/api/v1/classes/{id}", f.clazz().getId()), f.outsider()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }
    @Test void lecturerEnrollsStudentThenAddedIsOne() throws Exception {
        Fixture f = classFixture();
        String body = "[{\"student_id\":" + f.student().getId() + "}]";
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId())
                .contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(1));
    }
    @Test void duplicateEnrollAddsNothing() throws Exception {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        String body = "[{\"student_id\":" + f.student().getId() + "}]";
        mockMvc.perform(auth(post("/api/v1/classes/{id}/enrollments", f.clazz().getId())
                .contentType(APPLICATION_JSON).content(body), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.added").value(0));
    }
    @Test void enrolledStudentViewsClass() throws Exception {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        mockMvc.perform(auth(get("/api/v1/classes/{id}", f.clazz().getId()), f.student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(f.clazz().getId()));
    }
    @Test void myClassesListsEnrolledClass() throws Exception {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        mockMvc.perform(auth(get("/api/v1/me/classes"), f.student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(f.clazz().getId()))
                .andExpect(jsonPath("$.total").value(1));
    }
    @Test void droppedStudentLosesClassAccess() throws Exception {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        mockMvc.perform(auth(delete("/api/v1/classes/{id}/enrollments/{sid}",
                f.clazz().getId(), f.student().getId()), f.lecturer()))
                .andExpect(status().isNoContent());
        mockMvc.perform(auth(get("/api/v1/classes/{id}", f.clazz().getId()), f.student()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }
}
