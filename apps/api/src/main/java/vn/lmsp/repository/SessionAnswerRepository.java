package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.SessionAnswer;
import java.util.Collection;
import java.util.List;

public interface SessionAnswerRepository extends JpaRepository<SessionAnswer, SessionAnswer.Key>, SessionAnswerPersister {
    List<SessionAnswer> findAllBySession_Id(Long sessionId);

    /** Số câu đã có câu trả lời của mỗi phiên — màn giám sát. Mỗi phần tử: [session_id, count]. */
    @Query("select a.session.id, count(a) from SessionAnswer a where a.session.id in :ids "
            + "and (a.response is not null or (a.sourceCode is not null and a.sourceCode <> '')) group by a.session.id")
    List<Object[]> countAnsweredBySession(@Param("ids") Collection<Long> sessionIds);
}
