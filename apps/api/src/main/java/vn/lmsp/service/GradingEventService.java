package vn.lmsp.service;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.GradingDtos.WorkerEvent;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.model.GradingResult;
import vn.lmsp.model.TestResult;
import vn.lmsp.repository.*;

@Service
public class GradingEventService {
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final GradingResultRepository results;
    private final TestResultRepository tests;
    private final QuestionVersionService snapshots;
    private final GradingScoreService scores;
    private final GradingNotifier notifier;
    private final NotificationService notifications;
    private final AuditService audit;

    public GradingEventService(SubmissionRepository submissions, GradingJobRepository jobs,
            GradingResultRepository results, TestResultRepository tests, QuestionVersionService snapshots,
            GradingScoreService scores, GradingNotifier notifier, NotificationService notifications, AuditService audit) {
        this.submissions = submissions; this.jobs = jobs; this.results = results; this.tests = tests;
        this.snapshots = snapshots; this.scores = scores; this.notifier = notifier; this.notifications = notifications; this.audit = audit;
    }

    @Transactional
    public void apply(WorkerEvent event) {
        var payload = event.payload();
        var submission = submissions.findLockedById(payload.submission_id())
                .orElseThrow(() -> new IllegalArgumentException("Unknown submission"));
        var job = jobs.findByJobId(payload.job_id()).orElseThrow(() -> new IllegalArgumentException("Unknown grading job"));
        if (!job.getSubmission().getId().equals(submission.getId()) || submission.getType() != SubmissionType.code)
            throw new IllegalArgumentException("Job does not match code submission");
        if (submission.isTerminal()) return;
        if ("submission.status".equals(event.event())) {
            if (payload.status() != SubmissionStatus.grading) throw new IllegalArgumentException("Invalid progress status");
            if (submission.getStatus() != SubmissionStatus.grading) {
                submission.startGrading();
                notifier.afterCommit(submission, payload);
            }
            return;
        }
        if (!"submission.graded".equals(event.event()) ||
                payload.status() != SubmissionStatus.completed && payload.status() != SubmissionStatus.failed)
            throw new IllegalArgumentException("Invalid terminal event");
        if (payload.status() == SubmissionStatus.failed && payload.compile_error())
            throw new IllegalArgumentException("Compilation errors must complete with zero points");
        var score = scores.score(submission, snapshots.read(submission.getQuestionVersion()), payload);
        var result = results.saveAndFlush(new GradingResult(job, score.total(), payload.status() == SubmissionStatus.failed,
                payload.compile_error(), payload.compile_output(), payload.error_message(),
                payload.duration_ms() == null ? 0 : payload.duration_ms(), LocalDateTime.now()));
        if (payload.test_results() != null) {
            for (var test : payload.test_results()) {
                tests.save(new TestResult(result, test.position(), test.status(), test.output(),
                        test.time_ms(), test.memory_kb(), score.tests().get(test.position())));
            }
        }
        submission.finish(payload.status(), score.total());
        audit.record(null, "submission.graded", "submission", submission.getId(), null,
                java.util.Map.of("status", payload.status().name(), "grading_attempt", job.getAttemptNo()));
        notifications.create(submission.getStudentId(), "submission.graded", "Đã có kết quả chấm bài",
                payload.status() == SubmissionStatus.failed ? "Hệ thống chấm gặp lỗi; vui lòng liên hệ giảng viên." : "Mở bài nộp để xem kết quả.",
                java.util.Map.of("submission_id", submission.getId(), "assignment_id", submission.getAssignmentId()));
        notifier.afterCommit(submission, payload);
    }
}
