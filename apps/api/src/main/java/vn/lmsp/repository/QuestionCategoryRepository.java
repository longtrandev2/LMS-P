package vn.lmsp.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.QuestionCategory;

public interface QuestionCategoryRepository extends JpaRepository<QuestionCategory, Long> {
    List<QuestionCategory> findAllByBank_IdOrderByNameAsc(Long bankId);
    Optional<QuestionCategory> findByIdAndBank_Id(Long id, Long bankId);
    Optional<QuestionCategory> findByBank_IdAndNameIgnoreCase(Long bankId, String name);
    boolean existsByBank_IdAndNameIgnoreCase(Long bankId, String name);
    long countByBank_Id(Long bankId);
}
