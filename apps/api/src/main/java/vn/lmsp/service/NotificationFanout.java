package vn.lmsp.service;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.repository.UserRepository;

/**
 * Gửi cùng một thông báo in-app cho nhiều người qua {@link NotificationService#create}. Nạp trước toàn bộ người nhận bằng
 * một truy vấn để lần tra cứu từng người trong {@code create} lấy từ persistence context (không truy vấn theo đầu người).
 */
@Service
@RequiredArgsConstructor
public class NotificationFanout {
    static final int TITLE_MAX = 200;
    private final UserRepository users;
    private final NotificationService notifications;

    /** Trả số người nhận (đã bỏ trùng). */
    @Transactional
    public int send(Collection<Long> userIds, String type, String title, String body, Map<String, Object> data) {
        Set<Long> recipients = new LinkedHashSet<>(userIds);
        if (recipients.isEmpty()) return 0;
        users.findAllById(recipients);
        String safeTitle = clip(title);
        for (Long userId : recipients) notifications.create(userId, type, safeTitle, body, data);
        return recipients.size();
    }

    static String clip(String title) {
        return title.length() > TITLE_MAX ? title.substring(0, TITLE_MAX) : title;
    }
}
