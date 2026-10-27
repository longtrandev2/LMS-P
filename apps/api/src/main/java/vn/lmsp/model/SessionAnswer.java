package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;

/** Câu trả lời đã tự lưu của một câu trong phiên — docs/exam-spec.md §5.4. */
@Entity
@Table(name = "session_answers")
@IdClass(SessionAnswer.Key.class)
@Getter
public class SessionAnswer {
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "session_id") private AttemptSession session;
    @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_question_id") private AssignmentQuestion assignmentQuestion;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") private AnswerResponse response;
    @Column(length = 20) private String language;
    @Column(name = "source_code", columnDefinition = "MEDIUMTEXT") private String sourceCode;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    protected SessionAnswer() { }
    public SessionAnswer(AttemptSession session, AssignmentQuestion assignmentQuestion) {
        this.session = session; this.assignmentQuestion = assignmentQuestion;
    }
    public Long getSessionId() { return session.getId(); }
    public Long getAssignmentQuestionId() { return assignmentQuestion.getId(); }
    public void saveAnswer(AnswerResponse value, LocalDateTime now) { response = value; updatedAt = now; }
    public void saveCode(String language, String sourceCode, LocalDateTime now) {
        this.language = language; this.sourceCode = sourceCode; updatedAt = now;
    }
    public boolean hasCode() { return sourceCode != null && !sourceCode.isBlank(); }

    public static class Key implements Serializable {
        private Long session;
        private Long assignmentQuestion;
        public Key() { }
        public Key(Long session, Long assignmentQuestion) { this.session = session; this.assignmentQuestion = assignmentQuestion; }
        @Override public boolean equals(Object other) {
            return other instanceof Key key && Objects.equals(session, key.session) && Objects.equals(assignmentQuestion, key.assignmentQuestion);
        }
        @Override public int hashCode() { return Objects.hash(session, assignmentQuestion); }
    }
}
