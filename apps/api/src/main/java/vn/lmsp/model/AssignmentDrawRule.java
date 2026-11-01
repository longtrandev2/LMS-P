package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;

/** Quy tắc bốc câu ngẫu nhiên trong một phần — docs/exam-spec.md §3.2, §3.4. `variantNo` null = mọi mã đề. */
@Entity
@Table(name = "assignment_draw_rules")
@Getter
public class AssignmentDrawRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "section_id") private AssignmentSection section;
    @Column(name = "variant_no") private Integer variantNo;
    @Column(nullable = false) private int position;
    @Column(name = "bank_id", nullable = false) private Long bankId;
    @Column(name = "category_id") private Long categoryId;
    @Enumerated(EnumType.STRING) @Column(length = 10) private QuestionDifficulty difficulty;
    @Enumerated(EnumType.STRING) @Column(length = 20) private QuestionType type;
    @Column(nullable = false) private int count;
    @Column(nullable = false, precision = 6, scale = 2) private BigDecimal points;
    protected AssignmentDrawRule() { }
    public AssignmentDrawRule(Assignment assignment, AssignmentSection section, Integer variantNo, int position, Long bankId,
            Long categoryId, QuestionDifficulty difficulty, QuestionType type, int count, BigDecimal points) {
        this.assignment = assignment; this.section = section; this.variantNo = variantNo; this.position = position;
        this.bankId = bankId; this.categoryId = categoryId; this.difficulty = difficulty; this.type = type;
        this.count = count; this.points = points;
    }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getSectionId() { return section == null ? null : section.getId(); }
}
