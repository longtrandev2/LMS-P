package vn.lmsp;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import vn.lmsp.model.User;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-AUTH-03: avatar upload/xóa/serve + PATCH /users/me (phone). */
class AvatarTest extends ApiTestSupport {
    // 8-byte PNG header thật để bytes so sánh ổn định
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5};

    private User student() { return user("student", "SV" + UUID.randomUUID().toString().substring(0, 8)); }

    @Test void uploadThenGetReturnsSameBytes() throws Exception {
        User sv = student();
        mockMvc.perform(auth(multipart("/api/v1/users/me/avatar")
                .file(new MockMultipartFile("file", "anh.png", "image/png", PNG)), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar_url").value("/api/v1/users/" + sv.getId() + "/avatar"));
        byte[] served = mockMvc.perform(auth(get("/api/v1/users/{id}/avatar", sv.getId()), sv))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(served).isEqualTo(PNG);
    }
    @Test void meIncludesAvatarUrlOnlyWhenPresent() throws Exception {
        User sv = student();
        mockMvc.perform(auth(get("/api/v1/auth/me"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar_url").doesNotExist());
        mockMvc.perform(auth(multipart("/api/v1/users/me/avatar")
                .file(new MockMultipartFile("file", "anh.png", "image/png", PNG)), sv)).andExpect(status().isOk());
        mockMvc.perform(auth(get("/api/v1/auth/me"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar_url").value("/api/v1/users/" + sv.getId() + "/avatar"));
    }
    @Test void uploadRejectsNonImageExtension() throws Exception {
        User sv = student();
        mockMvc.perform(auth(multipart("/api/v1/users/me/avatar")
                .file(new MockMultipartFile("file", "ghi-chu.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8))), sv))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
    @Test void uploadRejectsOversizeImage() throws Exception {
        User sv = student();
        mockMvc.perform(auth(multipart("/api/v1/users/me/avatar")
                .file(new MockMultipartFile("file", "lon.png", "image/png", new byte[3 * 1024 * 1024])), sv))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
    @Test void deleteRemovesAvatarThenGetIs404() throws Exception {
        User sv = student();
        mockMvc.perform(auth(multipart("/api/v1/users/me/avatar")
                .file(new MockMultipartFile("file", "anh.png", "image/png", PNG)), sv)).andExpect(status().isOk());
        mockMvc.perform(auth(delete("/api/v1/users/me/avatar"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar_url").doesNotExist());
        mockMvc.perform(auth(get("/api/v1/users/{id}/avatar", sv.getId()), sv))
                .andExpect(status().isNotFound());
    }
    @Test void avatarWithoutUploadIs404() throws Exception {
        User sv = student();
        mockMvc.perform(auth(get("/api/v1/users/{id}/avatar", sv.getId()), sv))
                .andExpect(status().isNotFound());
    }
    @Test void updateMeAcceptsPhone() throws Exception {
        User sv = student();
        mockMvc.perform(auth(patch("/api/v1/users/me").contentType(APPLICATION_JSON)
                .content("{\"phone\":\"0901234567\",\"full_name\":\"Nguyễn Văn Mới\"}"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0901234567"))
                .andExpect(jsonPath("$.full_name").value("Nguyễn Văn Mới"));
        mockMvc.perform(auth(get("/api/v1/auth/me"), sv))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0901234567"));
    }
}
