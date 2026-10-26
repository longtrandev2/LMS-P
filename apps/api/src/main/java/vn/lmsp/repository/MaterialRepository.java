package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.Material;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    Page<Material> findByLmsClass_IdOrderByCreatedAtDescIdDesc(Long classId, Pageable pageable);
    /** Tìm học liệu theo tiêu đề (q null → tất cả), sort do Pageable quyết định. */
    @Query(value="select m from Material m where m.lmsClass.id=:classId and (:q is null or lower(m.title) like lower(concat('%',:q,'%')))",
           countQuery="select count(m) from Material m where m.lmsClass.id=:classId and (:q is null or lower(m.title) like lower(concat('%',:q,'%')))")
    Page<Material> search(@Param("classId") Long classId, @Param("q") String query, Pageable pageable);
}
