package vn.lmsp.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.SessionClock;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;

/** Thông báo `session.upcoming` 30 phút trước mỗi buổi, mỗi buổi đúng một lần — spec §7. */
@Service
@RequiredArgsConstructor
public class SessionReminderService {
    static final int LEAD_MINUTES = 30;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private final ClassSessionRepository sessions;
    private final EnrollmentRepository enrollments;
    private final NotificationService notifications;

    /** Trả số buổi đã gửi thông báo trong lượt này. */
    @Transactional
    public int sendDue() {
        LocalDateTime now = UtcTime.now();
        int sent = 0;
        for (ClassSession session : sessions.findUpcomingToNotify(now, now.plusMinutes(LEAD_MINUTES))) {
            if (sessions.markUpcomingNotified(session.getId(), now) == 0) continue;
            LmsClass clazz = session.getLmsClass();
            sent++;
            if (clazz.getStatus() == ClassStatus.locked) continue;
            String place = session.getMode() == SessionMode.online ? "trực tuyến"
                    : session.getRoom() == null ? "trực tiếp" : "phòng " + session.getRoom();
            String body = "Buổi " + session.getSessionNo() + " lúc " + SessionClock.toLocal(session.getStartsAt()).format(TIME)
                    + " (" + place + ")";
            Map<String, Object> data = Map.of("session_id", session.getId(), "class_id", clazz.getId(),
                    "starts_at", session.getStartsAt().toString());
            for (var enrollment : enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(clazz.getId(), EnrollmentStatus.active))
                notifications.create(enrollment.getStudent().getId(), "session.upcoming",
                        title(clazz.getName()), body, data);
        }
        return sent;
    }

    private static String title(String className) {
        String value = "Buổi học sắp bắt đầu: " + className;
        return value.length() > 200 ? value.substring(0, 200) : value;
    }
}
