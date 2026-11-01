package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentDrawRule;
import vn.lmsp.repository.QuestionRepository;

/**
 * Kho câu của từng quy tắc — docs/exam-spec.md §3.4: ứng viên như `POST /questions/draw`, sắp theo id, trừ câu cố định
 * và câu đã thuộc kho của quy tắc đứng trước. Kho chia toàn cục, không phụ thuộc `variant_no`. Quiz luôn loại câu code.
 */
@Component
@RequiredArgsConstructor
public class PoolResolver {
    private final QuestionRepository questions;

    /** `rules` đã theo thứ tự chia kho ({@link BlueprintLoader#partitionOrder}); kết quả theo id quy tắc. */
    public Map<Long, List<Long>> resolve(Assignment assignment, List<AssignmentDrawRule> rules, Collection<Long> fixedQuestionIds) {
        Set<QuestionType> excluded = assignment.getCategory() == AssignmentCategory.QUIZ
                ? EnumSet.of(QuestionType.programming) : EnumSet.noneOf(QuestionType.class);
        Set<Long> taken = new HashSet<>(fixedQuestionIds);
        Map<Long, List<Long>> pools = new LinkedHashMap<>();
        for (AssignmentDrawRule rule : rules) {
            List<Long> pool = rule.getType() != null && excluded.contains(rule.getType()) ? new ArrayList<>()
                    : new ArrayList<>(new TreeSet<>(questions.findDrawCandidates(rule.getBankId(), rule.getCategoryId(),
                            rule.getType(), rule.getDifficulty(), excluded)));
            pool.removeIf(taken::contains);
            taken.addAll(pool);
            pools.put(rule.getId(), List.copyOf(pool));
        }
        return pools;
    }
}
