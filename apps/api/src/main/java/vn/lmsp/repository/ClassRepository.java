package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import vn.lmsp.model.LmsClass;

public interface ClassRepository extends JpaRepository<LmsClass, Long> {
    @Override @EntityGraph(attributePaths={"course","lecturer"})
    Page<LmsClass> findAll(Pageable pageable);
    @EntityGraph(attributePaths={"course","lecturer"})
    Page<LmsClass> findByCourse_Id(Long courseId, Pageable pageable);
}
