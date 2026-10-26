package vn.lmsp.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.GradingDtos.SubmissionDetails;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.repository.GradingResultRepository;
import vn.lmsp.repository.SubmissionRepository;

@Service
public class SubmissionReadService {
    private final SubmissionRepository submissions;
    private final GradingResultRepository results;
    private final AssignmentAccess access;
    private final GradingMapper mapper;

    public SubmissionReadService(SubmissionRepository submissions, GradingResultRepository results,
            AssignmentAccess access, GradingMapper mapper) {
        this.submissions = submissions;
        this.results = results;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public SubmissionDetails get(Long id, Long actor, boolean lecturer, boolean admin) {
        var submission = submissions.findById(id).orElseThrow(() ->
                new LmsException("NOT_FOUND", "Không tìm thấy bài nộp", HttpStatus.NOT_FOUND, null));
        boolean own = submission.getStudentId().equals(actor);
        boolean privileged = !own && (admin || lecturer);
        if (privileged) access.lecturerAssignment(submission.getAssignmentId(), actor, admin, false);
        else if (own) access.studentAssignment(submission.getAssignmentId(), actor, false);
        else throw new LmsException("FORBIDDEN", "Bạn không có quyền xem bài nộp này", HttpStatus.FORBIDDEN, null);
        var result = results.findTopBySubmission_IdOrderByAttemptNoDesc(id)
                .map(item -> mapper.toResult(item, privileged)).orElse(null);
        return mapper.toDetails(submission, result);
    }
}
