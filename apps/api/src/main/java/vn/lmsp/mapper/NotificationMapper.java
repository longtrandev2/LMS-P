package vn.lmsp.mapper;

import org.springframework.stereotype.Component;
import vn.lmsp.dto.NotificationDtos.Item;
import vn.lmsp.model.Notification;

@Component
public class NotificationMapper {
    public Item toView(Notification notification) {
        return new Item(notification.getId(), notification.getType(), notification.getTitle(),
                notification.getBody(), notification.getData(), notification.isRead(), notification.getCreatedAt());
    }
}
