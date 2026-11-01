package vn.lmsp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Announcement;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    Page<Announcement> findAllByOrderByCreatedAtDescIdDesc(Pageable page);
}
