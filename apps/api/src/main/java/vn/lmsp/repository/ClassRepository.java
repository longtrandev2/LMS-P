package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import vn.lmsp.model.LmsClass;
import java.util.List;
import java.util.Optional;

public interface ClassRepository extends JpaRepository<LmsClass, Long> {
    /** Khoá dòng lớp (SELECT ... FOR UPDATE) để serialize kiểm tra sĩ số BR11 khi ghi danh. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from LmsClass c where c.id=:id")
    Optional<LmsClass> findByIdForUpdate(@Param("id") Long id);
    @Override @EntityGraph(attributePaths={"course","lecturer","coLecturer"})
    Page<LmsClass> findAll(Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer","coLecturer"})
    Page<LmsClass> findByCourse_Id(Long courseId, Pageable pageable);
    /** Tìm lớp theo mã/tên + lọc course_id/semester (tham số null → bỏ điều kiện). */
    @Query(value="select c from LmsClass c where (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester) and (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')))",
           countQuery="select count(c) from LmsClass c where (:courseId is null or c.course.id=:courseId) and (:semester is null or c.semester=:semester) and (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')))")
    @EntityGraph(attributePaths={"course","lecturer","coLecturer"})
    Page<LmsClass> search(@Param("courseId") Long courseId, @Param("semester") String semester, @Param("q") String query, Pageable pageable);
    /** Id lớp mà user là giảng viên chính hoặc đồng phụ trách (FR-CRS-07). */
    @Query("select c.id from LmsClass c where c.lecturer.id=:userId or c.coLecturer.id=:userId")
    List<Long> findTeachingClassIds(@Param("userId") Long userId);
}
