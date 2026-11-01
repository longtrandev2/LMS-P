package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;

@Entity
@Table(name = "question_options")
@Getter
public class QuestionOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "is_correct", nullable = false) private boolean correct;
    @Column(nullable = false) private int position;
    protected QuestionOption() { }
    public QuestionOption(Question question, String content, boolean correct, int position) {
        this.question = question; this.content = content; this.correct = correct; this.position = position;
    }
}
