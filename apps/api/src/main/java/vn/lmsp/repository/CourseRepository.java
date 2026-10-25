package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import vn.lmsp.model.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Course c where c.id=:id")
    Optional<Course> findLockedById(@Param("id") Long id);

    @EntityGraph(attributePaths = "creator")
    @Query("select c from Course c where (:q is null or lower(c.code) like lower(concat('%',:q,'%')) or lower(c.name) like lower(concat('%',:q,'%')))")
    Page<Course> search(@Param("q") String query, Pageable pageable);
}
