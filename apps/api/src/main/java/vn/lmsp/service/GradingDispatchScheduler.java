package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class GradingDispatchScheduler {
    private final GradingOutboxDispatcher dispatcher;

    @Scheduled(fixedDelayString = "${lms.grading.dispatch-delay-ms:1000}")
    public void dispatch() {
        try {
            for (int i = 0; i < 10 && !Thread.currentThread().isInterrupted(); i++) {
                if (!dispatcher.publishNext()) break;
            }
        } catch (RuntimeException error) {
            log.warn("Grading outbox will retry: {}", error.getClass().getSimpleName());
        }
    }
}
