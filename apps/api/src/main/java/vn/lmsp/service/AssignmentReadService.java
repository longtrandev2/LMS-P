package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.AssignmentDtos.AssignmentDetails;
import vn.lmsp.dto.AssignmentDtos.AssignmentQuestionView;
import vn.lmsp.dto.AssignmentDtos.AssignmentSummary;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.QuestionVersionRepository;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AssignmentReadService {
    private final AssignmentQuestionRepository links;
    private final QuestionVersionRepository versions;
    private final QuestionVersionService snapshots;
    private final AssignmentMapper mapper;

    public AssignmentSummary summary(Assignment assignment) {
        return mapper.toSummary(assignment, links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId()));
    }

    public AssignmentDetails details(Assignment assignment, boolean includePrivateData) {
        var questions = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignment.getId());
        var views = questions.stream().map(question -> questionView(question, includePrivateData)).toList();
        return mapper.toDetails(mapper.toSummary(assignment, questions), views);
    }

    private AssignmentQuestionView questionView(AssignmentQuestion question, boolean includePrivateData) {
        QuestionVersion version = question.getQuestionVersion() != null ? question.getQuestionVersion()
                : versions.findTopByQuestion_IdOrderByVersionNoDesc(question.getQuestionId()).orElseThrow();
        return mapper.toQuestionView(question, version.getId(), snapshots.read(version), includePrivateData);
    }
}
