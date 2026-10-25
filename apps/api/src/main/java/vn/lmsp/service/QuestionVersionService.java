package vn.lmsp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.model.Question;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.model.User;
import vn.lmsp.repository.QuestionVersionRepository;

@Service
public class QuestionVersionService {
    private final QuestionVersionRepository versions;
    private final QuestionReadService reader;
    private final ObjectMapper json;

    public QuestionVersionService(QuestionVersionRepository versions, QuestionReadService reader, ObjectMapper json) {
        this.versions = versions;
        this.reader = reader;
        this.json = json;
    }

    @Transactional
    public void saveVersion(Question question, User actor) {
        var snapshot = json.valueToTree(reader.snapshot(question));
        versions.save(new QuestionVersion(question, versions.maxVersion(question.getId()) + 1, snapshot, actor));
    }

    public QuestionSnapshot read(QuestionVersion version) {
        try {
            return json.treeToValue(version.getSnapshot(), QuestionSnapshot.class);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Question snapshot is invalid", error);
        }
    }
}
