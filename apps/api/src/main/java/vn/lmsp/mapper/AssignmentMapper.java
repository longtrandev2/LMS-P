package vn.lmsp.mapper;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.PaperDtos.AssignmentQuestionView;
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
                assignment.getReviewMode(), assignment.isReviewShowsAnswers(), assignment.isShuffleQuestions(),
                assignment.isShuffleOptions(), assignment.isPublished(), questions.size(), points,
                assignment.getCreatedAt(), assignment.getUpdatedAt(), assignment.getTimeLimitMinutes(),
                assignment.getPaperMode(), assignment.getVariantCount(), assignment.getRulesText(),
                assignment.isSessionBased() ? "session" : "standard");
    }

    public AssignmentDetails toDetails(AssignmentSummary summary, List<AssignmentQuestionView> questions) {
        return new AssignmentDetails(summary, questions);
    }

    public Map<String, Object> toAuditValue(Assignment assignment) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("title", assignment.getTitle());
        value.put("description", assignment.getDescription());
        value.put("category", assignment.getCategory());
        value.put("available_from", assignment.getAvailableFrom());
        value.put("due_at", assignment.getDueAt());
        value.put("allow_late", assignment.isAllowLate());
        value.put("late_due_at", assignment.getLateDueAt());
        value.put("late_penalty_percent", assignment.getLatePenaltyPercent());
        value.put("review_mode", assignment.getReviewMode());
        value.put("review_shows_answers", assignment.isReviewShowsAnswers());
        value.put("shuffle_questions", assignment.isShuffleQuestions());
        value.put("shuffle_options", assignment.isShuffleOptions());
        value.put("is_published", assignment.isPublished());
        return value;
    }
}
