package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.NotificationDtos.*;
import vn.lmsp.mapper.NotificationMapper;
import vn.lmsp.model.Notification;
import vn.lmsp.model.User;
import vn.lmsp.repository.NotificationRepository;
import vn.lmsp.repository.UserRepository;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ObjectMapper json;
    private final NotificationMapper mapper;
    private final RealtimePublisher realtime;

    @Transactional(readOnly=true) public Page list(Long userId, Boolean read, int page, int limit) {
        var request=PageRequest.of(page-1, limit, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        var result=read == null ? notifications.findByUser_Id(userId, request) : notifications.findByUser_IdAndRead(userId, read, request);
        return new Page(result.getContent().stream().map(mapper::toView).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional public Item markRead(Long userId, Long id) {
        Notification item=notifications.findById(id).filter(n -> n.getUser().getId().equals(userId))
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy thông báo", HttpStatus.NOT_FOUND, null));
        item.markRead(); return mapper.toView(item);
    }
    @Transactional public ReadAll markAllRead(Long userId) { return new ReadAll(notifications.markAllRead(userId)); }
    @Transactional public void create(Long userId, String type, String title, String body, Map<String,Object> data) {
        User owner=users.findById(userId).orElse(null); if(owner==null) return;
        Notification saved=notifications.save(new Notification(owner, type, title, body, data==null ? null : json.valueToTree(data)));
        // Tín hiệu `notification.created` sau commit — message-contracts.md §6.1; client đọc lại danh sách qua REST.
        realtime.toUser(userId, "notification.created", signal(saved==null ? null : saved.getId(), type));
    }
    private static Map<String,Object> signal(Long id, String type) {
        Map<String,Object> data=new java.util.LinkedHashMap<>();
        data.put("notification_id", id); data.put("type", type);
        return data;
    }
}
