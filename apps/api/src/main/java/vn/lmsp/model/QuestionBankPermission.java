package vn.lmsp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import vn.lmsp.enums.BankPermission;

@Entity
@Table(name = "question_bank_permissions")
public class QuestionBankPermission {
    @EmbeddedId private Key id;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("bankId") @JoinColumn(name = "bank_id") private QuestionBank bank;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("lecturerId") @JoinColumn(name = "lecturer_id") private User lecturer;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private BankPermission permission;
    @Column(name = "granted_at", nullable = false) private LocalDateTime grantedAt;

    protected QuestionBankPermission() { }
    public QuestionBankPermission(QuestionBank bank, User lecturer, BankPermission permission) {
        this.id = new Key(bank.getId(), lecturer.getId());
        this.bank = bank; this.lecturer = lecturer; this.permission = permission;
        this.grantedAt = LocalDateTime.now();
    }
    public Long getBankId() { return id.bankId; }
    public Long getLecturerId() { return id.lecturerId; }
    public BankPermission getPermission() { return permission; }
    public void setPermission(BankPermission value) { permission = value; }

    @Embeddable
    public static class Key implements java.io.Serializable {
        @Column(name = "bank_id") private Long bankId;
        @Column(name = "lecturer_id") private Long lecturerId;
        protected Key() { }
        public Key(Long bankId, Long lecturerId) { this.bankId = bankId; this.lecturerId = lecturerId; }
        @Override public boolean equals(Object value) {
            return value instanceof Key other && java.util.Objects.equals(bankId, other.bankId)
                    && java.util.Objects.equals(lecturerId, other.lecturerId);
        }
        @Override public int hashCode() { return java.util.Objects.hash(bankId, lecturerId); }
    }
}
