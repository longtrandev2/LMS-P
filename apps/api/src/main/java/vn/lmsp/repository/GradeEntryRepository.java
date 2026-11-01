package vn.lmsp.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.model.GradeEntry;

public interface GradeEntryRepository extends JpaRepository<GradeEntry, Long> {
    List<GradeEntry> findAllByClassId(Long classId);
    Optional<GradeEntry> findByClassIdAndStudentIdAndComponent(Long classId, Long studentId, GradeComponent component);
}
