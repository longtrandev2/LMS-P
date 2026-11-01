package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.QuestionOption;
import java.util.List;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {
    List<QuestionOption> findAllByQuestion_IdOrderByPositionAsc(Long questionId);
    void deleteAllByQuestion_Id(Long questionId);
}
