package vn.lmsp.dto;

import java.util.List;

public record UserSummary(Long id, String email, String full_name, String student_code, String phone,
                          String avatar_url, String status, List<String> roles) {
}
