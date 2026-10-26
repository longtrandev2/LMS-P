package vn.lmsp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.SortParam;
import vn.lmsp.dto.NotificationDtos.*;
import vn.lmsp.model.Notification;
import vn.lmsp.model.User;
import vn.lmsp.repository.NotificationRepository;
import vn.lmsp.repository.UserRepository;
import java.util.Map;

@Service
public class NotificationService {
    private static final Map<String,String> SORT_FIELDS=Map.of("created_at","createdAt");
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ObjectMapper json;
    public NotificationService(NotificationRepository notifications, UserRepository users, ObjectMapper json) {
        this.notifications=notifications; this.users=users; this.json=json;
    }
    @Transactional(readOnly=true) public Page list(Long userId, Boolean read, String sort, int page, int limit) {
        var order=SortParam.parse(sort, SORT_FIELDS, SortParam.desc("createdAt","id"));
        var request=PageRequest.of(page-1, limit, order);
        var result=read == null ? notifications.findByUser_Id(userId, request) : notifications.findByUser_IdAndRead(userId, read, request);
        return new Page(result.getContent().stream().map(this::view).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional public Item markRead(Long userId, Long id) {
        Notification item=notifications.findById(id).filter(n -> n.getUser().getId().equals(userId))
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy thông báo", HttpStatus.NOT_FOUND, null));
        item.markRead(); return view(item);
    }
    @Transactional public ReadAll markAllRead(Long userId) { return new ReadAll(notifications.markAllRead(userId)); }
    @Transactional public void create(Long userId, String type, String title, String body, Map<String,Object> data) {
        User owner=users.findById(userId).orElse(null); if(owner==null) return;
        notifications.save(new Notification(owner, type, title, body, data==null ? null : json.valueToTree(data)));
    }
    private Item view(Notification n) {
        return new Item(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getData(), n.isRead(), n.getCreatedAt());
    }
}
