package vn.lmsp.mapper;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;

@Component
public class AssignmentMapper {
    public AssignmentSummary toSummary(Assignment assignment, List<AssignmentQuestion> questions) {
        BigDecimal points = questions.stream().map(AssignmentQuestion::getPoints)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new AssignmentSummary(assignment.getId(), assignment.getClassId(), assignment.getTitle(),
                assignment.getDescription(), assignment.getCategory(), assignment.getAvailableFrom(),
                assignment.getDueAt(), assignment.isAllowLate(), assignment.getLateDueAt(),
                assignment.getLatePenaltyPercent(), assignment.getMaxAttempts(), assignment.getScorePolicy(),
                assignment.isPublished(), questions.size(), points, assignment.getCreatedAt(), assignment.getUpdatedAt());
    }

    public AssignmentDetails toDetails(AssignmentSummary summary, List<AssignmentQuestionView> questions) {
        return new AssignmentDetails(summary, questions);
    }

    public AssignmentQuestionView toQuestionView(AssignmentQuestion question, Long versionId,
            QuestionSnapshot snapshot, boolean includePrivateData) {
        var options = snapshot.options() == null ? List.<AssignmentOptionView>of() : snapshot.options().stream()
                .map(option -> new AssignmentOptionView(option.id(), option.content(),
                        includePrivateData ? option.is_correct() : null)).toList();
        var testCases = snapshot.test_cases() == null ? List.<TestCaseView>of() : snapshot.test_cases().stream()
                .filter(testCase -> includePrivateData || testCase.is_public()).toList();
        var programming = snapshot.programming();
        return new AssignmentQuestionView(question.getQuestionId(), versionId, snapshot.type(), snapshot.content(),
                snapshot.topic(), snapshot.difficulty(), question.getPoints(), question.getPosition(), options,
                programming == null ? null : programming.starter_code(),
                programming == null ? null : programming.allowed_languages(),
                programming == null ? null : programming.time_limit_ms(),
                programming == null ? null : programming.memory_limit_mb(), testCases);
    }

    public Map<String, Object> toAuditValue(Assignment assignment) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("title", assignment.getTitle());
        value.put("category", assignment.getCategory());
        value.put("due_at", assignment.getDueAt());
        value.put("is_published", assignment.isPublished());
        return value;
    }
}
