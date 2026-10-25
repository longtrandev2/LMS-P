package vn.lmsp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class GradingDispatchScheduler {
    private static final Logger log = LoggerFactory.getLogger(GradingDispatchScheduler.class);
    private final GradingOutboxDispatcher dispatcher;

    public GradingDispatchScheduler(GradingOutboxDispatcher dispatcher) { this.dispatcher = dispatcher; }

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
