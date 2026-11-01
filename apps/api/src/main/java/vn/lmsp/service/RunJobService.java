package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.RunDtos.RunJobView;
import vn.lmsp.dto.RunDtos.RunPayload;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.mapper.RunJobMapper;
import vn.lmsp.model.RunJob;
import vn.lmsp.repository.RunJobRepository;

/** Run job (kiểm tra đề / chạy thử) — assessment-spec.md §7. Lưu job + outbox; RunOutboxDispatcher gửi sang worker. */
@Service
@RequiredArgsConstructor
public class RunJobService implements RunJobGateway, ProblemCheckGate {
    private final RunJobRepository jobs;
    private final RunJobMapper mapper;

    @Override
    @Transactional
    public String create(RunJobKind kind, Long requestedBy, Long questionId, Long questionVersionId,
            Long assignmentId, RunPayload payload) {
        if (kind == null || requestedBy == null || payload == null) throw new IllegalArgumentException("Run job thiếu dữ liệu bắt buộc");
        return jobs.save(new RunJob(kind, requestedBy, questionId, questionVersionId, assignmentId, payload, UtcTime.now())).getJobId();
    }

    @Override
    @Transactional(readOnly = true)
    public Status status(Long questionVersionId) {
        if (questionVersionId == null) return Status.UNVERIFIED;
        return jobs.findFirstByQuestionVersionIdAndKindOrderByCreatedAtDescIdDesc(questionVersionId, RunJobKind.problem_check)
                .filter(job -> RunJob.COMPLETED.equals(job.getStatus()) && job.getVerdict() != null)
                .map(job -> job.getVerdict() == GradingVerdict.AC ? Status.PASSED : Status.FAILED)
                .orElse(Status.UNVERIFIED);
    }

    /** `GET /run-jobs/{id}`: chỉ người tạo job; admin xem được. */
    @Transactional(readOnly = true)
    public RunJobView view(String runId, Long actor, boolean admin) {
        RunJob job = jobs.findByJobId(runId)
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy lượt chạy", HttpStatus.NOT_FOUND, null));
        if (!admin && !job.getRequestedBy().equals(actor))
            throw new LmsException("FORBIDDEN", "Bạn không có quyền xem lượt chạy này", HttpStatus.FORBIDDEN, null);
        return mapper.toView(job);
    }
}
