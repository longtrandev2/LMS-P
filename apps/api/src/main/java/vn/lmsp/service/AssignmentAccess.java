package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.AssignmentRepository;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.EnrollmentRepository;

@Component
@RequiredArgsConstructor
public class AssignmentAccess {
    private final AssignmentRepository assignments;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;

    public LmsClass lecturerClass(Long id, Long actor, boolean admin) {
        LmsClass item = classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
        if (!admin && !item.getLecturerId().equals(actor)) throw denied();
        return item;
    }
    public LmsClass studentClass(Long id, Long studentId) {
        LmsClass item = classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
        if (item.getStatus() == ClassStatus.locked ||
                !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(id, studentId, EnrollmentStatus.active)) throw denied();
        return item;
    }
    public Assignment lecturerAssignment(Long id, Long actor, boolean admin, boolean lock) {
        Assignment item = (lock ? assignments.findLockedById(id) : assignments.findById(id))
                .orElseThrow(() -> notFound("Không tìm thấy bài tập"));
        if (!admin && !item.getLecturerId().equals(actor)) throw denied();
        return item;
    }
    public Assignment studentAssignment(Long id, Long studentId, boolean lock) {
        Assignment item = (lock ? assignments.findLockedById(id) : assignments.findById(id))
                .orElseThrow(() -> notFound("Không tìm thấy bài tập"));
        if (!item.isPublished()) throw notFound("Không tìm thấy bài tập");
        if (item.getLmsClass().getStatus() == ClassStatus.locked ||
                !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(item.getClassId(), studentId, EnrollmentStatus.active))
            throw denied();
        return item;
    }
    private LmsException notFound(String message) { return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null); }
    private LmsException denied() { return new LmsException("FORBIDDEN", "Bạn không có quyền truy cập bài tập này", HttpStatus.FORBIDDEN, null); }
}
