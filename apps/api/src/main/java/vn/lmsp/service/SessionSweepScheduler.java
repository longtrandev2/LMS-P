package vn.lmsp.service;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.lmsp.common.UtcTime;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.AttemptSessionRepository;

/**
 * Tự nộp phiên hết giờ — docs/exam-spec.md §5.6: mỗi 5 giây lấy tối đa 100 phiên `in_progress` có
 * `ends_at + ân hạn < now`, nộp từng phiên trong giao dịch riêng (`timeout`). Lỗi một phiên không chặn phiên khác.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionSweepScheduler {
    static final int BATCH = 100;
    private final AttemptSessionRepository sessions;
    private final SessionSubmitService submitter;

    @Scheduled(fixedDelayString = "${lms.sessions.sweep-delay-ms:5000}")
    public void sweep() {
        LocalDateTime before = UtcTime.now().minusSeconds(AttemptSession.GRACE_SECONDS);
        try {
            for (Long id : sessions.findDueIds(before, PageRequest.of(0, BATCH))) {
                if (Thread.currentThread().isInterrupted()) break;
                try {
                    submitter.submitIfDue(id, before);
                } catch (RuntimeException error) {
                    log.warn("Auto-submit of attempt session {} will retry: {}", id, error.getClass().getSimpleName());
                }
            }
        } catch (RuntimeException error) {
            log.warn("Attempt session sweep will retry: {}", error.getClass().getSimpleName());
        }
    }
}
