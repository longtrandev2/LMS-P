package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import vn.lmsp.model.LmsClass;

public interface ClassRepository extends JpaRepository<LmsClass, Long> {
    @Override @EntityGraph(attributePaths={"course","lecturer"})
    Page<LmsClass> findAll(Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer"})
    Page<LmsClass> findByCourse_Id(Long courseId, Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer"})
    @Query(value="select c from LmsClass c where (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')) or lower(c.semester) like lower(concat('%',:q,'%')) or lower(c.course.code) like lower(concat('%',:q,'%')) or lower(c.course.name) like lower(concat('%',:q,'%'))) and (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester)",
           countQuery="select count(c) from LmsClass c where (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')) or lower(c.semester) like lower(concat('%',:q,'%')) or lower(c.course.code) like lower(concat('%',:q,'%')) or lower(c.course.name) like lower(concat('%',:q,'%'))) and (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester)")
    Page<LmsClass> search(@Param("q") String query, @Param("courseId") Long courseId,
                          @Param("semester") String semester, Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer"})
    @Query(value="select c from LmsClass c where c.lecturer.id=:lecturerId and (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')) or lower(c.semester) like lower(concat('%',:q,'%')) or lower(c.course.code) like lower(concat('%',:q,'%')) or lower(c.course.name) like lower(concat('%',:q,'%'))) and (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester)",
           countQuery="select count(c) from LmsClass c where c.lecturer.id=:lecturerId and (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')) or lower(c.semester) like lower(concat('%',:q,'%')) or lower(c.course.code) like lower(concat('%',:q,'%')) or lower(c.course.name) like lower(concat('%',:q,'%'))) and (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester)")
    Page<LmsClass> searchForLecturer(@Param("q") String query, @Param("courseId") Long courseId,
                                     @Param("semester") String semester, @Param("lecturerId") Long lecturerId, Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer"})
    @Query("select c from LmsClass c where c.status=vn.lmsp.enums.ClassStatus.active and (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')) or lower(c.semester) like lower(concat('%',:q,'%')) or lower(c.course.code) like lower(concat('%',:q,'%')) or lower(c.course.name) like lower(concat('%',:q,'%')))")
    Page<LmsClass> searchCatalog(@Param("q") String query, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from LmsClass c where c.id=:id")
    Optional<LmsClass> findLockedById(@Param("id") Long id);
    @EntityGraph(attributePaths={"course"})
    List<LmsClass> findAllByLecturer_IdOrderByIdDesc(Long lecturerId);
    boolean existsByCourse_IdAndLecturer_Id(Long courseId, Long lecturerId);
    @Query("select distinct c.lecturer from LmsClass c where c.course.id=:courseId and c.lecturer.id<>:ownerId order by c.lecturer.fullName")
    List<vn.lmsp.model.User> findOtherLecturers(@Param("courseId") Long courseId, @Param("ownerId") Long ownerId);
    boolean existsByIdAndLecturer_Id(Long id, Long lecturerId);
}
