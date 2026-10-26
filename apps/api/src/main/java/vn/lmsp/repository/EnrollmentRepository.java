package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    List<Enrollment> findAllByStudent_IdAndStatus(Long studentId, EnrollmentStatus status);
    boolean existsByLmsClass_IdAndStudent_IdAndStatus(Long classId, Long studentId, EnrollmentStatus status);
    long countByLmsClass_IdAndStatus(Long classId, EnrollmentStatus status);
    /** Danh sách SV của lớp theo tên/email/mã SV (q null → tất cả), sort do Pageable quyết định. */
    @Query(value="select e from Enrollment e where e.lmsClass.id=:classId and e.status=:status and (:q is null or lower(e.student.fullName) like lower(concat('%',:q,'%')) or lower(e.student.email) like lower(concat('%',:q,'%')) or lower(e.student.studentCode) like lower(concat('%',:q,'%')))",
           countQuery="select count(e) from Enrollment e where e.lmsClass.id=:classId and e.status=:status and (:q is null or lower(e.student.fullName) like lower(concat('%',:q,'%')) or lower(e.student.email) like lower(concat('%',:q,'%')) or lower(e.student.studentCode) like lower(concat('%',:q,'%')))")
    @EntityGraph(attributePaths="student")
    Page<Enrollment> searchStudents(@Param("classId") Long classId, @Param("status") EnrollmentStatus status, @Param("q") String query, Pageable pageable);
}
