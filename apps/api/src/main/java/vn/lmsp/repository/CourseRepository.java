package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {
    /** Tìm theo mã/tên khóa học (q rỗng → tất cả), sắp xếp do Pageable quyết định. */
    @Query(value="select c from Course c where (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')))",
           countQuery="select count(c) from Course c where (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')))")
    Page<Course> search(@Param("q") String query, Pageable pageable);
}
