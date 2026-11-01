package vn.lmsp.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.RunDtos.RunEvent;
import vn.lmsp.dto.RunDtos.RunEventPayload;
import vn.lmsp.dto.RunJobResult;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.model.RunJob;
import vn.lmsp.repository.RunJobRepository;

/** Áp event worker → API của run job (message-contracts.md §5). Event lỗi ném IllegalArgumentException → DLQ. */
@Service
@RequiredArgsConstructor
public class RunEventService {
    private final RunJobRepository jobs;
    private final RunNotifier notifier;

    @Transactional
    public void apply(RunEvent event) {
        RunEventPayload payload = event.payload();
        RunJob job = jobs.findLockedByJobId(payload.run_id())
                .orElseThrow(() -> new IllegalArgumentException("Unknown run job"));
        if (job.isTerminal()) return;
        switch (event.event()) {
            case "run.status" -> {
                if (!RunJob.RUNNING.equals(payload.status()) || payload.verdict() != null)
                    throw new IllegalArgumentException("Invalid run progress event");
                if (RunJob.PENDING.equals(job.getStatus())) job.start();
            }
            case "run.completed" -> finish(job, payload);
            default -> throw new IllegalArgumentException("Unknown run event");
        }
    }

    private void finish(RunJob job, RunEventPayload payload) {
        boolean completed = RunJob.COMPLETED.equals(payload.status());
        boolean failed = RunJob.FAILED.equals(payload.status());
        if (!completed && !failed) throw new IllegalArgumentException("Invalid terminal run event");
        if (completed && (payload.verdict() == null || payload.verdict() == GradingVerdict.SYSTEM_ERROR))
            throw new IllegalArgumentException("Invalid run verdict");
        if (failed && payload.verdict() != GradingVerdict.SYSTEM_ERROR)
            throw new IllegalArgumentException("Invalid run system failure");
        var result = new RunJobResult(payload.compile_output(), payload.error_message(), payload.duration_ms(),
                payload.tests() == null ? List.of() : payload.tests());
        job.finish(payload.status(), payload.verdict(), result, UtcTime.now());
        notifier.afterCommit(job);
    }
}
