package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Material;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    Page<Material> findByLmsClass_IdOrderByCreatedAtDescIdDesc(Long classId, Pageable pageable);
}
