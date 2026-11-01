package vn.lmsp.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;

/** Điểm nhập (ghi đè tay / CSV / kỳ thi) của một thành phần — docs/database-design.md §2.8. */
@Entity
@Table(name = "grade_entries", uniqueConstraints = @UniqueConstraint(name = "uq_grade_entry",
        columnNames = {"class_id", "student_id", "component"}))
@Getter
public class GradeEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "class_id", nullable = false) private Long classId;
    @Column(name = "student_id", nullable = false) private Long studentId;
    @Convert(converter = GradeComponentConverter.class)
    @Column(nullable = false, columnDefinition = "enum('attendance','assignment','midterm','final')")
    private GradeComponent component;
    @Column(nullable = false, precision = 4, scale = 2) private BigDecimal score;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private GradeSource source;
    @Column(length = 500) private String reason;
    @Column(name = "updated_by", nullable = false) private Long updatedBy;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    protected GradeEntry() { }

    public GradeEntry(Long classId, Long studentId, GradeComponent component) {
        this.classId = classId; this.studentId = studentId; this.component = component;
    }

    public void record(BigDecimal score, GradeSource source, String reason, Long actorId) {
        this.score = score; this.source = source; this.reason = reason;
        this.updatedBy = actorId; this.updatedAt = UtcTime.now();
    }
}
