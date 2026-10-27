package vn.lmsp.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.model.Assignment;

/** Truy vấn cho thông báo `exam.upcoming` / `grade.released` — docs/admin-spec.md §8. */
public interface AssignmentNotificationRepository extends Repository<Assignment, Long> {
    @Query("select a from Assignment a join fetch a.lmsClass where a.published=true and a.upcomingNotifiedAt is null"
            + " and a.category in :categories and a.availableFrom <= :until order by a.availableFrom, a.id")
    List<Assignment> findUpcomingToNotify(@Param("categories") Collection<AssignmentCategory> categories,
                                          @Param("until") LocalDateTime until);

    /** Bài `after_close` đã đóng (hạn nộp muộn nếu cho nộp muộn, ngược lại hạn chính thức) và chưa báo kết quả. */
    @Query("select a from Assignment a join fetch a.lmsClass where a.published=true and a.resultsNotifiedAt is null"
            + " and a.category in :categories and a.reviewMode=vn.lmsp.enums.ReviewMode.after_close"
            + " and ((a.allowLate=true and a.lateDueAt is not null and a.lateDueAt <= :closedBy)"
            + " or ((a.allowLate=false or a.lateDueAt is null) and a.dueAt <= :closedBy)) order by a.dueAt, a.id")
    List<Assignment> findClosedToRelease(@Param("categories") Collection<AssignmentCategory> categories,
                                         @Param("closedBy") LocalDateTime closedBy);

    /** Đánh dấu đã gửi; trả 0 nếu tiến trình khác đã đánh dấu trước (gửi đúng một lần). */
    @Modifying
    @Query("update Assignment a set a.upcomingNotifiedAt=:now where a.id=:id and a.upcomingNotifiedAt is null")
    int markUpcomingNotified(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("update Assignment a set a.resultsNotifiedAt=:now where a.id=:id and a.resultsNotifiedAt is null")
    int markResultsNotified(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** Sinh viên có ít nhất một lượt nộp (lượt quiz kiểu cũ và lượt của phiên làm bài đều tạo `assignment_attempts`). */
    interface Submitter { Long getAssignmentId(); Long getStudentId(); }
    @Query("select distinct t.assignment.id as assignmentId, t.student.id as studentId from AssignmentAttempt t"
            + " where t.assignment.id in :ids")
    List<Submitter> findSubmitters(@Param("ids") Collection<Long> assignmentIds);
}
