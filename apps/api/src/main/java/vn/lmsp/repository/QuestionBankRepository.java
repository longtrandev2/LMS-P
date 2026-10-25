package vn.lmsp.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.QuestionBank;

public interface QuestionBankRepository extends JpaRepository<QuestionBank, Long> {
    Optional<QuestionBank> findFirstByCourse_IdOrderByIdAsc(Long courseId);

    @EntityGraph(attributePaths = {"course", "owner"})
    @Query("select b from QuestionBank b where (:admin=true or b.owner.id=:actor " +
           "or (exists (select c.id from LmsClass c where c.course=b.course and c.lecturer.id=:actor) " +
           "and (b.visibility='shared' or exists (select p.id from QuestionBankPermission p where p.bank=b and p.lecturer.id=:actor)))) " +
           "and (:courseId is null or b.course.id=:courseId or (b.course is null and b.owner.id=:actor)) order by b.name")
    List<QuestionBank> findAccessible(@Param("actor") Long actor, @Param("admin") boolean admin,
                                      @Param("courseId") Long courseId);
}
