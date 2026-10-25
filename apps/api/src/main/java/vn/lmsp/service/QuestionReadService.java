package vn.lmsp.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.QuestionSummary;
import vn.lmsp.dto.QuestionDtos.QuestionView;
import vn.lmsp.mapper.QuestionMapper;
import vn.lmsp.model.Question;
import vn.lmsp.repository.QuestionOptionRepository;
import vn.lmsp.repository.QuestionProgrammingRepository;
import vn.lmsp.repository.QuestionVersionRepository;
import vn.lmsp.repository.TestCaseRepository;

@Service
@Transactional(readOnly = true)
public class QuestionReadService {
    private final QuestionOptionRepository options;
    private final QuestionProgrammingRepository programming;
    private final TestCaseRepository testCases;
    private final QuestionVersionRepository versions;
    private final QuestionMapper mapper;

    public QuestionReadService(QuestionOptionRepository options, QuestionProgrammingRepository programming,
            TestCaseRepository testCases, QuestionVersionRepository versions, QuestionMapper mapper) {
        this.options = options;
        this.programming = programming;
        this.testCases = testCases;
        this.versions = versions;
        this.mapper = mapper;
    }

    public QuestionSummary summary(Question question) {
        return mapper.toSummary(question, versions.maxVersion(question.getId()));
    }

    public QuestionView view(Question question) {
        return mapper.toView(question, versions.maxVersion(question.getId()), snapshot(question));
    }

    public QuestionSnapshot snapshot(Question question) {
        return mapper.toSnapshot(question, options.findAllByQuestion_IdOrderByPositionAsc(question.getId()),
                programming.findById(question.getId()).orElse(null),
                testCases.findAllByQuestion_IdOrderByPositionAsc(question.getId()));
    }
}
