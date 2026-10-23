package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.lmsp.model.Enrollment;
import vn.lmsp.enums.EnrollmentStatus;
import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByLmsClass_IdAndStudent_Id(Long classId, Long studentId);
    @EntityGraph(attributePaths="student")
    Page<Enrollment> findByLmsClass_IdAndStatusOrderByStudent_Id(Long classId, EnrollmentStatus status, Pageable pageable);
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course","lmsClass.lecturer"})
    Page<Enrollment> findByStudent_IdOrderByLmsClass_Id(Long studentId, Pageable pageable);
    List<Enrollment> findAllByLmsClass_IdAndStatusOrderByStudent_Id(Long classId, EnrollmentStatus status);
    boolean existsByLmsClass_IdAndStudent_IdAndStatus(Long classId, Long studentId, EnrollmentStatus status);
}
