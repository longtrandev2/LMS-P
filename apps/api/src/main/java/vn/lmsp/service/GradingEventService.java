package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.GradingDtos.WorkerEvent;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.model.GradingResult;
import vn.lmsp.repository.GradingJobRepository;
import vn.lmsp.repository.GradingResultRepository;
import vn.lmsp.repository.SubmissionRepository;

@Service
@RequiredArgsConstructor
public class GradingEventService {
    private static final Set<GradingVerdict> CODE_VERDICTS = Set.of(
            GradingVerdict.AC, GradingVerdict.WA, GradingVerdict.CE,
            GradingVerdict.TLE, GradingVerdict.MLE, GradingVerdict.RE);
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final GradingResultRepository results;
    private final GradingNotifier notifier;
    private final NotificationService notifications;
    private final AuditService audit;

    @Transactional
    public void apply(WorkerEvent event) {
        var payload = event.payload();
        var submission = submissions.findLockedById(payload.submission_id())
                .orElseThrow(() -> new IllegalArgumentException("Unknown submission"));
        var job = jobs.findByJobId(payload.job_id())
                .orElseThrow(() -> new IllegalArgumentException("Unknown grading job"));
        if (!job.getSubmission().getId().equals(submission.getId()) || submission.getType() != SubmissionType.code)
            throw new IllegalArgumentException("Job does not match code submission");
        if (submission.isTerminal()) return;
        if ("submission.status".equals(event.event())) {
            if (payload.status() != SubmissionStatus.grading || payload.verdict() != null)
                throw new IllegalArgumentException("Invalid progress event");
            if (submission.getStatus() != SubmissionStatus.grading) {
                submission.startGrading();
                notifier.afterCommit(submission, payload);
            }
            return;
        }
        applyTerminal(event, submission, job);
    }

    private void applyTerminal(WorkerEvent event, vn.lmsp.model.Submission submission,
            vn.lmsp.model.GradingJob job) {
        var payload = event.payload();
        boolean completed = payload.status() == SubmissionStatus.completed;
        boolean failed = payload.status() == SubmissionStatus.failed;
        if (!"submission.graded".equals(event.event()) || (!completed && !failed))
            throw new IllegalArgumentException("Invalid terminal event");
        if (completed && (payload.verdict() == null || !CODE_VERDICTS.contains(payload.verdict())
                || payload.compile_error() != (payload.verdict() == GradingVerdict.CE)))
            throw new IllegalArgumentException("Invalid code verdict");
        if (failed && (payload.verdict() != GradingVerdict.SYSTEM_ERROR || payload.compile_error()))
            throw new IllegalArgumentException("Invalid system failure");

        results.saveAndFlush(new GradingResult(job, payload.verdict(), failed, payload.compile_error(),
                payload.compile_output(), payload.error_message(),
                payload.duration_ms() == null ? 0 : payload.duration_ms(), LocalDateTime.now()));
        submission.finish(payload.status(), payload.verdict());
        audit.record(null, "submission.graded", "submission", submission.getId(), null,
                java.util.Map.of("status", payload.status().name(), "verdict", payload.verdict().name(),
                        "grading_attempt", job.getAttemptNo()));
        notifications.create(submission.getStudentId(), "submission.graded", "Đã có kết quả chấm bài",
                failed ? "Hệ thống chấm gặp lỗi; vui lòng liên hệ giảng viên." : "Mở bài nộp để xem verdict.",
                java.util.Map.of("submission_id", submission.getId(), "assignment_id", submission.getAssignmentId()));
        notifier.afterCommit(submission, payload);
    }
}
