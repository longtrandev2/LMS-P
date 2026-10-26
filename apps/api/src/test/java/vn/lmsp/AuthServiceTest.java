package vn.lmsp;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import vn.lmsp.model.User;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FR-AUTH-01/02: login bằng email hoặc MSV, throttle 5 lần sai/15', refresh rotate, logout toàn bộ. */
class AuthServiceTest extends ApiTestSupport {
    private static String msv() { return "SV" + UUID.randomUUID().toString().substring(0, 8); }

    private MockHttpServletRequestBuilder login(String account, String password) {
        return post("/api/v1/auth/login").contentType(APPLICATION_JSON)
                .content("{\"account\":\"" + account + "\",\"password\":\"" + password + "\"}");
    }

    @Test void loginSucceedsWithEmail() throws Exception {
        User sv = user("student", msv());
        mockMvc.perform(login(sv.getEmail(), PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(sv.getEmail()));
    }
    @Test void loginSucceedsWithStudentCode() throws Exception {
        User sv = user("student", msv());
        mockMvc.perform(login(sv.getStudentCode(), PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.user.student_code").value(sv.getStudentCode()));
    }
    @Test void loginStudentCodeIsCaseInsensitive() throws Exception {
        User sv = user("student", msv());
        mockMvc.perform(login(sv.getStudentCode().toLowerCase(), PASSWORD)).andExpect(status().isOk());
    }
    @Test void wrongPasswordRejected() throws Exception {
        User sv = user("student", msv());
        mockMvc.perform(login(sv.getEmail(), "sai-mat-khau"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }
    @Test void unknownAccountRejected() throws Exception {
        mockMvc.perform(login("khong-ton-tai-" + UUID.randomUUID() + "@test.local", PASSWORD))
                .andExpect(status().isUnauthorized());
    }
    @Test void fiveFailuresLockAccount() throws Exception {
        User sv = user("student", msv());
        for (int i = 0; i < 5; i++)
            mockMvc.perform(login(sv.getEmail(), "sai")).andExpect(status().isUnauthorized());
        mockMvc.perform(login(sv.getEmail(), PASSWORD))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }
    @Test void lockIsPerAccount() throws Exception {
        User a = user("student", msv());
        User b = user("student", msv());
        for (int i = 0; i < 5; i++)
            mockMvc.perform(login(a.getEmail(), "sai")).andExpect(status().isUnauthorized());
        mockMvc.perform(login(b.getEmail(), PASSWORD)).andExpect(status().isOk());
    }
    @Test void refreshRotatesAndRevokesOldToken() throws Exception {
        User sv = user("student", msv());
        String refresh = json.readTree(mockMvc.perform(login(sv.getEmail(), PASSWORD))
                .andReturn().getResponse().getContentAsString()).get("refresh_token").asText();
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + refresh + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.access_token").isNotEmpty());
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void logoutRevokesAllSessions() throws Exception {
        User sv = user("student", msv());
        String first = mockMvc.perform(login(sv.getEmail(), PASSWORD)).andReturn().getResponse().getContentAsString();
        String access = json.readTree(first).get("access_token").asText();
        String refresh2 = json.readTree(mockMvc.perform(login(sv.getEmail(), PASSWORD))
                .andReturn().getResponse().getContentAsString()).get("refresh_token").asText();
        mockMvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer " + access))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(APPLICATION_JSON)
                        .content("{\"refresh_token\":\"" + refresh2 + "\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void meRequiresToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void meReturnsProfile() throws Exception {
        User sv = user("student", msv());
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken(sv)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(sv.getEmail()));
    }
}
