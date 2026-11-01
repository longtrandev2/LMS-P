package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.AssignmentRepository;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.EnrollmentRepository;

/** Quyền phía sinh viên với bài giao theo phiên và phiên của mình — docs/exam-spec.md §5.2, §5.3. Lỗi luôn là 404. */
@Component
@RequiredArgsConstructor
public class SessionAccess {
    private final AssignmentRepository assignments;
    private final EnrollmentRepository enrollments;
    private final AttemptSessionRepository sessions;

    /**
     * Bài đã xuất bản của lớp sinh viên đang học, khóa dòng bài để các lần bắt đầu phiên đồng thời
     * (và chia mã đề) chạy tuần tự.
     */
    public Assignment lockedStudentAssignment(Long assignmentId, Long studentId) {
        Assignment assignment = assignments.findLockedById(assignmentId)
                .orElseThrow(() -> notFound("Không tìm thấy bài tập"));
        if (!assignment.isPublished() || assignment.getLmsClass().getStatus() == ClassStatus.locked
                || !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(assignment.getClassId(), studentId, EnrollmentStatus.active))
            throw notFound("Không tìm thấy bài tập");
        return assignment;
    }

    /** Phiên của chính sinh viên; `lock` = khóa dòng phiên (ghi câu trả lời, sự kiện, nộp). */
    public AttemptSession ownSession(Long sessionId, Long studentId, boolean lock) {
        return (lock ? sessions.findForUpdate(sessionId) : sessions.findById(sessionId))
                .filter(session -> session.getStudentId().equals(studentId))
                .orElseThrow(() -> notFound("Không tìm thấy phiên làm bài"));
    }

    static LmsException notFound(String message) {
        return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null);
    }

    static LmsException ended() {
        return new LmsException("SESSION_ENDED", "Phiên làm bài đã kết thúc", HttpStatus.CONFLICT, null);
    }

    static LmsException invalid(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
