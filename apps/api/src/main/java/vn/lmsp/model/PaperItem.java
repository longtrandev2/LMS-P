package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

/** Câu trong một đề, theo thứ tự gốc (trước khi trộn theo sinh viên). */
@Entity
@Table(name = "paper_items")
@IdClass(PaperItem.Key.class)
@Getter
public class PaperItem {
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "paper_id") private AssessmentPaper paper;
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_question_id") private AssignmentQuestion assignmentQuestion;
    @Column(nullable = false) private int position;
    protected PaperItem() { }
    public PaperItem(AssessmentPaper paper, AssignmentQuestion assignmentQuestion, int position) {
        this.paper = paper; this.assignmentQuestion = assignmentQuestion; this.position = position;
    }
    public Long getPaperId() { return paper.getId(); }
    public Long getAssignmentQuestionId() { return assignmentQuestion.getId(); }

    public static class Key implements Serializable {
        private Long paper;
        private Long assignmentQuestion;
        public Key() { }
        public Key(Long paper, Long assignmentQuestion) { this.paper = paper; this.assignmentQuestion = assignmentQuestion; }
        @Override public boolean equals(Object other) {
            return other instanceof Key key && Objects.equals(paper, key.paper) && Objects.equals(assignmentQuestion, key.assignmentQuestion);
        }
        @Override public int hashCode() { return Objects.hash(paper, assignmentQuestion); }
    }
}
