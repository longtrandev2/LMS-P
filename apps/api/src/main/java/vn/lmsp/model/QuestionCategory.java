package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "question_categories", uniqueConstraints = @UniqueConstraint(name = "uq_question_categories_bank_name", columnNames = {"bank_id", "name"}))
public class QuestionCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bank_id", nullable = false) private QuestionBank bank;
    @Column(nullable = false, length = 100) private String name;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by", nullable = false) private User creator;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected QuestionCategory() { }
    public QuestionCategory(QuestionBank bank, String name, User creator) { this.bank = bank; this.name = name; this.creator = creator; }
    @PrePersist void timestamp() { createdAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getBankId() { return bank.getId(); }
    public QuestionBank getBank() { return bank; }
    public String getName() { return name; }
    public void rename(String value) { name = value; }
}
