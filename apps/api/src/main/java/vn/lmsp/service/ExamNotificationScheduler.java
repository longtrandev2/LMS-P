package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Chạy mỗi phút: `exam.upcoming` và `grade.released` (ExamNotificationService) — docs/admin-spec.md §8. */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExamNotificationScheduler {
    private final ExamNotificationService notices;

    @Scheduled(cron = "${lms.notifications.exam-cron:0 * * * * *}")
    public void run() {
        try {
            notices.sendUpcoming();
        } catch (RuntimeException error) {
            log.warn("Exam upcoming notifications will retry: {}", error.getClass().getSimpleName());
        }
        try {
            notices.releaseResults();
        } catch (RuntimeException error) {
            log.warn("Result release notifications will retry: {}", error.getClass().getSimpleName());
        }
    }
}
