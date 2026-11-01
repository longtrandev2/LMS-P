package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.model.AssignmentDrawRule;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AssignmentSection;
import vn.lmsp.repository.AssignmentDrawRuleRepository;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.repository.AssignmentSectionRepository;

/** Đọc cấu trúc đề đã lưu của một bài — docs/exam-spec.md §3.1–3.2. */
@Component
@RequiredArgsConstructor
public class BlueprintLoader {
    /**
     * `fixed` = câu chọn tay (theo position), `drawn` = câu đã bốc khi xuất bản, `rules` theo thứ tự chia kho
     * (quy tắc không thuộc phần nào trước, rồi theo vị trí phần, rồi vị trí quy tắc — exam-spec.md §3.4).
     */
    public record Blueprint(List<AssignmentSection> sections, List<AssignmentQuestion> fixed,
                            List<AssignmentQuestion> drawn, List<AssignmentDrawRule> rules) {
        /** Chỉ số (từ 0) của phần trong đề, -1 nếu không có phần. */
        public int sectionIndex(AssignmentSection section) {
            if (section == null) return -1;
            for (int i = 0; i < sections.size(); i++) {
                AssignmentSection candidate = sections.get(i);
                if (candidate == section || section.getId() != null && section.getId().equals(candidate.getId())) return i;
            }
            return -1;
        }
        public Integer sectionIndexOrNull(AssignmentSection section) {
            int index = sectionIndex(section);
            return index < 0 ? null : index;
        }
        public List<Long> fixedQuestionIds() { return fixed.stream().map(AssignmentQuestion::getQuestionId).toList(); }
        public List<AssignmentQuestion> allLinks() {
            List<AssignmentQuestion> all = new ArrayList<>(fixed);
            all.addAll(drawn);
            return all;
        }
        public List<AssignmentDrawRule> rulesByPosition() {
            return rules.stream().sorted(Comparator.comparingInt(AssignmentDrawRule::getPosition)).toList();
        }
    }

    private final AssignmentSectionRepository sections;
    private final AssignmentQuestionRepository links;
    private final AssignmentDrawRuleRepository rules;

    public Blueprint load(Long assignmentId) {
        List<AssignmentQuestion> all = links.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId);
        return new Blueprint(sections.findAllByAssignment_IdOrderByPositionAsc(assignmentId),
                all.stream().filter(AssignmentQuestion::isFixed).toList(),
                all.stream().filter(link -> !link.isFixed()).toList(),
                partitionOrder(rules.findAllByAssignment_IdOrderByPositionAscIdAsc(assignmentId)));
    }

    public static List<AssignmentDrawRule> partitionOrder(List<AssignmentDrawRule> rules) {
        return rules.stream().sorted(Comparator
                .comparingInt((AssignmentDrawRule rule) -> rule.getSection() == null ? -1 : rule.getSection().getPosition())
                .thenComparingInt(AssignmentDrawRule::getPosition)
                .thenComparing(rule -> rule.getId() == null ? Long.MAX_VALUE : rule.getId())).toList();
    }
}
