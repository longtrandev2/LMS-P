package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.QuestionVersion;
import java.util.Optional;

public interface QuestionVersionRepository extends JpaRepository<QuestionVersion, Long> {
    @Query("select coalesce(max(v.versionNo), 0) from QuestionVersion v where v.question.id=:questionId")
    int maxVersion(@Param("questionId") Long questionId);
    Optional<QuestionVersion> findTopByQuestion_IdOrderByVersionNoDesc(Long questionId);
}
