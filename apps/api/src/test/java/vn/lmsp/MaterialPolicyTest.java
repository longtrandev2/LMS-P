package vn.lmsp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.lmsp.model.Enrollment;
import vn.lmsp.model.User;
import vn.lmsp.repository.EnrollmentRepository;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-CRS-03 + M3: học liệu chỉ truy cập khi ghi danh active; quản lý học liệu chỉ dành cho lecturer chủ lớp. */
class MaterialPolicyTest extends ApiTestSupport {
    @Autowired protected EnrollmentRepository enrollments;
    private static final byte[] PDF = "%PDF-1.4 noi dung test".getBytes(StandardCharsets.UTF_8);

    private MockHttpServletRequestBuilder upload(Long classId, String filename, byte[] bytes) {
        return multipart("/api/v1/classes/{id}/materials", classId)
                .file(new MockMultipartFile("file", filename, "application/pdf", bytes))
                .param("title", "Tài liệu học tập");
    }
    /** Lớp có sinh viên đã ghi danh (nhưng chưa có học liệu). */
    private Fixture prepared() {
        Fixture f = classFixture();
        enrollments.save(new Enrollment(f.clazz(), f.student()));
        return f;
    }

    @Test void lecturerUploadsPdfSuccessfully() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(upload(f.clazz().getId(), "slide1.pdf", PDF), f.lecturer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("pdf"));
    }
    @Test void uploadRejectsUnknownExtension() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(upload(f.clazz().getId(), "virus.exe", PDF), f.lecturer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
    @Test void uploadRejectsOversizeFile() throws Exception {
        Fixture f = classFixture(); // profile test đặt max-mb=1
        mockMvc.perform(auth(upload(f.clazz().getId(), "lon.pdf", new byte[2 * 1024 * 1024]), f.lecturer()))
                .andExpect(status().isBadRequest());
    }
    @Test void enrolledStudentListsMaterials() throws Exception {
        Fixture f = prepared();
        mockMvc.perform(auth(upload(f.clazz().getId(), "slide1.pdf", PDF), f.lecturer())).andExpect(status().isCreated());
        mockMvc.perform(auth(get("/api/v1/classes/{id}/materials", f.clazz().getId()), f.student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Tài liệu học tập"));
    }
    @Test void materialUploadNotifiesEnrolledStudents() throws Exception {
        Fixture f = prepared();
        mockMvc.perform(auth(upload(f.clazz().getId(), "slide1.pdf", PDF), f.lecturer())).andExpect(status().isCreated());
        mockMvc.perform(auth(get("/api/v1/notifications"), f.student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].type").value("material.created"));
    }
    @Test void outsiderCannotListMaterials() throws Exception {
        Fixture f = classFixture();
        mockMvc.perform(auth(get("/api/v1/classes/{id}/materials", f.clazz().getId()), f.outsider()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }
    @Test void enrolledStudentCannotUpload() throws Exception {
        Fixture f = prepared();
        mockMvc.perform(auth(upload(f.clazz().getId(), "sv.pdf", PDF), f.student()))
                .andExpect(status().isForbidden());
    }
    @Test void otherLecturerCannotUpload() throws Exception {
        Fixture f = classFixture();
        User lecturerKhac = user("lecturer", null);
        mockMvc.perform(auth(upload(f.clazz().getId(), "khac.pdf", PDF), lecturerKhac))
                .andExpect(status().isForbidden());
    }
    @Test void downloadReturnsUploadedBytes() throws Exception {
        Fixture f = prepared();
        String body = mockMvc.perform(auth(upload(f.clazz().getId(), "slide1.pdf", PDF), f.lecturer()))
                .andReturn().getResponse().getContentAsString();
        long materialId = json.readTree(body).get("id").asLong();
        byte[] downloaded = mockMvc.perform(auth(get("/api/v1/materials/{id}/download", materialId), f.student()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(PDF);
    }
    @Test void linkMaterialHasNoDownload() throws Exception {
        Fixture f = prepared();
        String body = mockMvc.perform(auth(post("/api/v1/classes/{id}/materials", f.clazz().getId())
                .contentType(APPLICATION_JSON)
                .content("{\"title\":\"Video bài giảng\",\"url\":\"https://example.com/video\"}"), f.lecturer()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long materialId = json.readTree(body).get("id").asLong();
        mockMvc.perform(auth(get("/api/v1/materials/{id}/download", materialId), f.student()))
                .andExpect(status().isBadRequest());
    }
}
