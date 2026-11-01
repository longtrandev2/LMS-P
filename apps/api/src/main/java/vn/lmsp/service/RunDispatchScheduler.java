package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RunDispatchScheduler {
    private final RunOutboxDispatcher dispatcher;

    @Scheduled(fixedDelayString = "${lms.runs.dispatch-delay-ms:500}")
    public void dispatch() {
        try {
            for (int i = 0; i < 10 && !Thread.currentThread().isInterrupted(); i++) {
                if (!dispatcher.publishNext()) break;
            }
        } catch (RuntimeException error) {
            log.warn("Run outbox will retry: {}", error.getClass().getSimpleName());
        }
    }
}
