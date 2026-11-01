package vn.lmsp.service;

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.AssignmentRepository;
import vn.lmsp.repository.EnrollmentRepository;

/**
 * `assignment.published` (quiz/bài tập) hoặc `exam.published` (giữa kỳ/cuối kỳ) cho sinh viên active của lớp —
 * docs/admin-spec.md §8. Chạy sau khi transaction xuất bản commit (cả bulk), trong transaction riêng; lỗi gửi thông báo
 * không làm hỏng việc xuất bản.
 */
@Service
@Slf4j
public class PublishNotifier {
    private final AssignmentRepository assignments;
    private final EnrollmentRepository enrollments;
    private final NotificationFanout fanout;
    private final TransactionTemplate newTransaction;

    public PublishNotifier(AssignmentRepository assignments, EnrollmentRepository enrollments, NotificationFanout fanout,
                           PlatformTransactionManager transactions) {
        this.assignments = assignments; this.enrollments = enrollments; this.fanout = fanout;
        this.newTransaction = new TransactionTemplate(transactions);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPublished(AssignmentPublishedEvent event) {
        try {
            newTransaction.executeWithoutResult(status -> notifyPublished(event.assignmentId()));
        } catch (RuntimeException error) {
            log.warn("Publish notification for assignment {} skipped: {}", event.assignmentId(), error.getClass().getSimpleName());
        }
    }

    /** Trả số sinh viên được thông báo. */
    public int notifyPublished(Long assignmentId) {
        Assignment item = assignments.findById(assignmentId).orElse(null);
        if (item == null || !item.isPublished() || item.getLmsClass().getStatus() == ClassStatus.locked) return 0;
        List<Long> students = enrollments.findStudentIdsByClassIds(List.of(item.getClassId()), EnrollmentStatus.active)
                .stream().map(EnrollmentRepository.ClassStudent::getStudentId).toList();
        return fanout.send(students, AssignmentNotices.publishedType(item), AssignmentNotices.publishedTitle(item),
                AssignmentNotices.publishedBody(item), AssignmentNotices.data(item));
    }
}
