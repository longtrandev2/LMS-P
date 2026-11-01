package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.AssignmentNotificationRepository;
import vn.lmsp.repository.EnrollmentRepository;

/**
 * `exam.upcoming` 30 phút trước giờ mở kỳ thi và `grade.released` khi bài `after_close` đóng — docs/admin-spec.md §8.
 * Mỗi bài gửi đúng một lần nhờ cột đánh dấu cập nhật có điều kiện; người nhận nạp theo lô (không truy vấn theo đầu người).
 */
@Service
@RequiredArgsConstructor
public class ExamNotificationService {
    static final int LEAD_MINUTES = 30;
    /** Chờ phiên làm bài đang dở được nộp tự động (sweep 5 giây) trước khi chốt danh sách người nộp. */
    static final int RELEASE_GRACE_MINUTES = 1;
    static final Set<AssignmentCategory> EXAMS = EnumSet.of(AssignmentCategory.MIDTERM, AssignmentCategory.FINAL);
    static final Set<AssignmentCategory> REVIEWABLE =
            EnumSet.of(AssignmentCategory.QUIZ, AssignmentCategory.MIDTERM, AssignmentCategory.FINAL);
    private final AssignmentNotificationRepository assignments;
    private final EnrollmentRepository enrollments;
    private final NotificationFanout fanout;

    /** Trả số kỳ thi đã gửi `exam.upcoming` trong lượt này (bỏ qua kỳ thi đã mở quá 30 phút: chỉ đánh dấu). */
    @Transactional
    public int sendUpcoming() {
        LocalDateTime now = UtcTime.now();
        List<Assignment> due = new ArrayList<>();
        for (Assignment exam : assignments.findUpcomingToNotify(EXAMS, now.plusMinutes(LEAD_MINUTES))) {
            if (assignments.markUpcomingNotified(exam.getId(), now) == 0) continue;
            boolean stale = exam.getAvailableFrom().isBefore(now.minusMinutes(LEAD_MINUTES));
            if (exam.isExam() && !stale && exam.getLmsClass().getStatus() != ClassStatus.locked) due.add(exam);
        }
        if (due.isEmpty()) return 0;
        Map<Long, List<Long>> students = studentsByClass(due);
        for (Assignment exam : due)
            fanout.send(students.getOrDefault(exam.getClassId(), List.of()), AssignmentNotices.EXAM_UPCOMING,
                    AssignmentNotices.upcomingTitle(exam), AssignmentNotices.upcomingBody(exam), AssignmentNotices.data(exam));
        return due.size();
    }

    /** Trả số bài đã gửi `grade.released` trong lượt này. Chỉ sinh viên có ít nhất một lượt nộp. */
    @Transactional
    public int releaseResults() {
        LocalDateTime now = UtcTime.now();
        List<Assignment> due = new ArrayList<>();
        for (Assignment item : assignments.findClosedToRelease(REVIEWABLE, now.minusMinutes(RELEASE_GRACE_MINUTES))) {
            if (assignments.markResultsNotified(item.getId(), now) == 0) continue;
            if (releasable(item) && item.getLmsClass().getStatus() != ClassStatus.locked) due.add(item);
        }
        if (due.isEmpty()) return 0;
        Map<Long, List<Long>> submitters = new HashMap<>();
        for (var row : assignments.findSubmitters(due.stream().map(Assignment::getId).toList()))
            submitters.computeIfAbsent(row.getAssignmentId(), key -> new ArrayList<>()).add(row.getStudentId());
        for (Assignment item : due)
            fanout.send(submitters.getOrDefault(item.getId(), List.of()), AssignmentNotices.GRADE_RELEASED,
                    AssignmentNotices.releasedTitle(item), AssignmentNotices.releasedBody(item), AssignmentNotices.data(item));
        return due.size();
    }

    /** Chỉ quiz/kỳ thi xem lại sau khi đóng (truy vấn đã lọc; kiểm tra lại cho chắc). */
    static boolean releasable(Assignment item) {
        return REVIEWABLE.contains(item.getCategory()) && item.getReviewMode() == ReviewMode.after_close;
    }

    private Map<Long, List<Long>> studentsByClass(List<Assignment> items) {
        Set<Long> classIds = new LinkedHashSet<>();
        items.forEach(item -> classIds.add(item.getClassId()));
        Map<Long, List<Long>> result = new HashMap<>();
        for (var row : enrollments.findStudentIdsByClassIds(classIds, EnrollmentStatus.active))
            result.computeIfAbsent(row.getClassId(), key -> new ArrayList<>()).add(row.getStudentId());
        return result;
    }
}
