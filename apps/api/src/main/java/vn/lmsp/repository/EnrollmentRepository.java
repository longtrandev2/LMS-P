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
    @EntityGraph(attributePaths="student")
    @Query(value="select e from Enrollment e where e.lmsClass.id=:classId and e.status=:status and (:q is null or lower(e.student.email) like lower(concat('%',:q,'%')) or lower(e.student.fullName) like lower(concat('%',:q,'%')) or lower(coalesce(e.student.studentCode,'')) like lower(concat('%',:q,'%'))) ",
           countQuery="select count(e) from Enrollment e where e.lmsClass.id=:classId and e.status=:status and (:q is null or lower(e.student.email) like lower(concat('%',:q,'%')) or lower(e.student.fullName) like lower(concat('%',:q,'%')) or lower(coalesce(e.student.studentCode,'')) like lower(concat('%',:q,'%'))) ")
    Page<Enrollment> searchRoster(@Param("classId") Long classId, @Param("status") EnrollmentStatus status,
                                  @Param("q") String query, Pageable pageable);
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course","lmsClass.lecturer"})
    Page<Enrollment> findByStudent_IdOrderByLmsClass_Id(Long studentId, Pageable pageable);
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course","lmsClass.lecturer"})
    @Query(value="select e from Enrollment e where e.student.id=:studentId and e.status=:status and (:q is null or lower(e.lmsClass.code) like lower(concat('%',:q,'%')) or lower(e.lmsClass.name) like lower(concat('%',:q,'%')) or lower(e.lmsClass.course.name) like lower(concat('%',:q,'%')) or lower(e.lmsClass.course.code) like lower(concat('%',:q,'%')) or lower(e.lmsClass.semester) like lower(concat('%',:q,'%'))) ",
           countQuery="select count(e) from Enrollment e where e.student.id=:studentId and e.status=:status and (:q is null or lower(e.lmsClass.code) like lower(concat('%',:q,'%')) or lower(e.lmsClass.name) like lower(concat('%',:q,'%')) or lower(e.lmsClass.course.name) like lower(concat('%',:q,'%')) or lower(e.lmsClass.course.code) like lower(concat('%',:q,'%')) or lower(e.lmsClass.semester) like lower(concat('%',:q,'%'))) ")
    Page<Enrollment> searchMyClasses(@Param("studentId") Long studentId, @Param("status") EnrollmentStatus status,
                                     @Param("q") String query, Pageable pageable);
    @EntityGraph(attributePaths={"lmsClass","lmsClass.course"})
    List<Enrollment> findAllByStudent_IdAndStatusOrderByLmsClass_Id(Long studentId, EnrollmentStatus status);
    List<Enrollment> findAllByLmsClass_IdAndStatusOrderByStudent_Id(Long classId, EnrollmentStatus status);
    boolean existsByLmsClass_IdAndStudent_IdAndStatus(Long classId, Long studentId, EnrollmentStatus status);
    long countByLmsClass_IdAndStatus(Long classId, EnrollmentStatus status);
    interface ClassEnrollmentCount { Long getClassId(); Long getEnrollmentCount(); }
    @Query("select e.lmsClass.id as classId, count(e.id) as enrollmentCount from Enrollment e where e.lmsClass.id in :ids and e.status=:status group by e.lmsClass.id")
    List<ClassEnrollmentCount> countByClassIds(@Param("ids") List<Long> classIds, @Param("status") EnrollmentStatus status);
}
