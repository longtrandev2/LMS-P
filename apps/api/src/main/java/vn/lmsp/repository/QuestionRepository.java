package vn.lmsp.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.Question;
import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    @Query("select q from Question q where q.deleted=false and (:ownerId is null or q.owner.id=:ownerId) " +
            "and (:bankId is null or q.category.bank.id=:bankId) and (:categoryId is null or q.category.id=:categoryId) " +
            "and (:type is null or q.type=:type) and (:difficulty is null or q.difficulty=:difficulty) " +
            "and (:topic is null or lower(q.topic)=lower(:topic)) " +
            "and (:query is null or lower(q.content) like lower(concat('%',:query,'%')) or lower(coalesce(q.topic,'')) like lower(concat('%',:query,'%')))" )
    Page<Question> search(@Param("ownerId") Long ownerId, @Param("bankId") Long bankId,
                          @Param("categoryId") Long categoryId, @Param("type") QuestionType type,
                          @Param("topic") String topic, @Param("difficulty") QuestionDifficulty difficulty,
                          @Param("query") String query, Pageable pageable);

    @Query("select q.id from Question q where q.deleted=false and q.category.bank.id=:bankId " +
            "and (:categoryId is null or q.category.id=:categoryId) and (:type is null or q.type=:type) " +
            "and (:difficulty is null or q.difficulty=:difficulty) " +
            "and (:excludeNone = true or q.type not in :excludedTypes)")
    List<Long> findDrawCandidates(@Param("bankId") Long bankId, @Param("categoryId") Long categoryId,
                                  @Param("type") QuestionType type, @Param("difficulty") QuestionDifficulty difficulty,
                                  @Param("excludeNone") boolean excludeNone,
                                  @Param("excludedTypes") java.util.Collection<QuestionType> excludedTypes);

    /** Ứng viên bốc đề; `excluded` rỗng = không loại loại câu nào. */
    default List<Long> findDrawCandidates(Long bankId, Long categoryId, QuestionType type, QuestionDifficulty difficulty,
                                          java.util.Set<QuestionType> excluded) {
        return findDrawCandidates(bankId, categoryId, type, difficulty, excluded.isEmpty(),
                excluded.isEmpty() ? List.of(QuestionType.mcq) : excluded);
    }

    Optional<Question> findByIdAndDeletedFalse(Long id);
    boolean existsByCategory_Bank_IdAndContentIgnoreCaseAndDeletedFalse(Long bankId, String content);
    boolean existsByCategory_Id(Long categoryId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from Question q where q.id=:id and q.deleted=false")
    Optional<Question> findLockedById(@Param("id") Long id);
}
