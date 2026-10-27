package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.PaperItem;
import java.util.Collection;
import java.util.List;

public interface PaperItemRepository extends JpaRepository<PaperItem, PaperItem.Key> {
    List<PaperItem> findAllByPaper_IdOrderByPositionAsc(Long paperId);
    List<PaperItem> findAllByPaper_IdInOrderByPaper_IdAscPositionAsc(Collection<Long> paperIds);
}
