package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.lmsp.model.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUser_Id(Long userId, Pageable pageable);
    Page<Notification> findByUser_IdAndRead(Long userId, boolean read, Pageable pageable);
    long countByUser_IdAndReadFalse(Long userId);
    @Modifying @Query("update Notification n set n.read=true where n.user.id=:userId and n.read=false")
    int markAllRead(@Param("userId") Long userId);
}
