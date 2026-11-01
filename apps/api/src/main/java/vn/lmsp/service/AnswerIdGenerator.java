package vn.lmsp.service;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** ID 8 ký tự hex ngẫu nhiên cho answer_spec (pairs/right_id/distractors/items) — assessment-spec.md §1.2. */
@Component
public class AnswerIdGenerator {
    private static final Pattern ID = Pattern.compile("[0-9a-f]{8}");
    private final SecureRandom random = new SecureRandom();

    /** Giữ ID client gửi nếu đúng định dạng và chưa dùng trong cùng câu; ngược lại sinh mới. Ghi ID vào `used`. */
    public String keepOrNew(String candidate, Set<String> used) {
        if (candidate != null && ID.matcher(candidate).matches() && used.add(candidate)) return candidate;
        String id;
        do {
            byte[] bytes = new byte[4];
            random.nextBytes(bytes);
            id = HexFormat.of().formatHex(bytes);
        } while (!used.add(id));
        return id;
    }
}
