package vn.lmsp.model;

import lombok.Getter;
import jakarta.persistence.*;

/** Phần của đề — docs/exam-spec.md §3.1. */
@Entity
@Table(name = "assignment_sections", uniqueConstraints = @UniqueConstraint(name = "uq_assignment_section_position", columnNames = {"assignment_id", "position"}))
@Getter
public class AssignmentSection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignment_id", nullable = false) private Assignment assignment;
    @Column(nullable = false) private int position;
    @Column(nullable = false, length = 200) private String title;
    protected AssignmentSection() { }
    public AssignmentSection(Assignment assignment, int position, String title) {
        this.assignment = assignment; this.position = position; this.title = title;
    }
    public Long getAssignmentId() { return assignment.getId(); }
}
