package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Chạy mỗi phút: gửi thông báo buổi học sắp diễn ra (SessionReminderService). */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionReminderScheduler {
    private final SessionReminderService reminders;

    @Scheduled(cron = "${lms.sessions.reminder-cron:0 * * * * *}")
    public void remind() {
        try {
            reminders.sendDue();
        } catch (RuntimeException error) {
            log.warn("Session reminders will retry: {}", error.getClass().getSimpleName());
        }
    }
}
