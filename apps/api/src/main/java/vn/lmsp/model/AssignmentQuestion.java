package vn.lmsp.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "assignment_questions", uniqueConstraints = @UniqueConstraint(name = "uq_assignment_question", columnNames = {"assignment_id", "question_id"}))
public class AssignmentQuestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_version_id") private QuestionVersion questionVersion;
    @Column(nullable = false, precision = 6, scale = 2) private BigDecimal points;
    @Column(nullable = false) private int position;
    protected AssignmentQuestion() { }
    public AssignmentQuestion(Assignment assignment, Question question, BigDecimal points, int position) {
        this.assignment = assignment; this.question = question; this.points = points; this.position = position;
    }
    public Long getId() { return id; }
    public Long getAssignmentId() { return assignment.getId(); }
    public Long getQuestionId() { return question.getId(); }
    public Question getQuestion() { return question; }
    public QuestionVersion getQuestionVersion() { return questionVersion; }
    public BigDecimal getPoints() { return points; }
    public int getPosition() { return position; }
    public void pin(QuestionVersion version) { questionVersion = version; }
    public void update(BigDecimal points, int position) { this.points = points; this.position = position; }
}
