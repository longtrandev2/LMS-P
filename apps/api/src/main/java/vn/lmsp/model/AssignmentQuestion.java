package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "assignment_questions", uniqueConstraints = @UniqueConstraint(name = "uq_assignment_question", columnNames = {"assignment_id", "question_id"}))
@Getter
public class AssignmentQuestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_version_id") private QuestionVersion questionVersion;
    @Column(nullable = false, precision = 6, scale = 2) private BigDecimal points;
    @Column(nullable = false) private int position;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "section_id") private AssignmentSection section;
    @Column(name = "variant_no") private Integer variantNo;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "draw_rule_id") private AssignmentDrawRule drawRule;
    protected AssignmentQuestion() { }
    public AssignmentQuestion(Assignment assignment, Question question, BigDecimal points, int position) {
        this.assignment = assignment; this.question = question; this.points = points; this.position = position;
    }
    /** Câu cố định trong một phần (`variantNo` null = mọi mã đề) — docs/exam-spec.md §3.2. */
    public AssignmentQuestion(Assignment assignment, Question question, BigDecimal points, int position,
                              AssignmentSection section, Integer variantNo) {
        this(assignment, question, points, position);
        this.section = section; this.variantNo = variantNo;
    }
    /** Câu bốc từ quy tắc khi xuất bản: điểm, phần và mã đề lấy theo quy tắc. */
    public static AssignmentQuestion drawn(Assignment assignment, Question question, AssignmentDrawRule rule, int position) {
        AssignmentQuestion link = new AssignmentQuestion(assignment, question, rule.getPoints(), position, rule.getSection(), rule.getVariantNo());
        link.drawRule = rule;
        return link;
    }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getSectionId() { return section == null ? null : section.getId(); }
    public Long getDrawRuleId() { return drawRule == null ? null : drawRule.getId(); }
    public boolean isFixed() { return drawRule == null; }
    public Long getQuestionId() { return question.getId(); }
    public void pin(QuestionVersion version) { questionVersion = version; }
    public void update(BigDecimal points, int position) { this.points = points; this.position = position; }
}
