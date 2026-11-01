package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.RealtimeView;
import vn.lmsp.security.GradingWebSocketHandler;

/** `GET /admin/realtime` — kết nối WebSocket chấm bài, user online theo vai trò, số worker (docs/admin-spec.md §3). */
@Service
@RequiredArgsConstructor
public class AdminRealtimeService {
    private final GradingWebSocketHandler sockets;
    private final ActivityTracker activity;
    private final QueueInspector queues;

    public RealtimeView realtime() {
        return new RealtimeView(sockets.connectionCount(), sockets.userCount(), activity.online(),
                queues.consumers(QueueInspector.GRADING), UtcTime.now());
    }
}
