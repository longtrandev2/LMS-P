package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.SessionEvent;
import java.time.LocalDateTime;
import java.util.List;

public interface SessionEventRepository extends JpaRepository<SessionEvent, Long> {
    List<SessionEvent> findAllBySession_IdOrderByOccurredAtAscIdAsc(Long sessionId);
    long countBySession_IdAndOccurredAtAfter(Long sessionId, LocalDateTime after);
}
