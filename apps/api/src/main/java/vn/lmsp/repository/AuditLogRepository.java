package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.AuditLog;
import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog,Long> {
    @Query(value="select a from AuditLog a where (:actor is null or a.actorId=:actor) and (:action is null or a.action=:action) and (:entity is null or a.entityType=:entity) and (:fromDate is null or a.createdAt>=:fromDate) and (:toDate is null or a.createdAt<:toDate) order by a.createdAt desc,a.id desc",
           countQuery="select count(a) from AuditLog a where (:actor is null or a.actorId=:actor) and (:action is null or a.action=:action) and (:entity is null or a.entityType=:entity) and (:fromDate is null or a.createdAt>=:fromDate) and (:toDate is null or a.createdAt<:toDate)")
    Page<AuditLog> search(@Param("actor") Long actor,@Param("action") String action,@Param("entity") String entity,
                          @Param("fromDate") LocalDateTime fromDate,@Param("toDate") LocalDateTime toDate,Pageable pageable);
}
