package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.EnrollmentRepository;

/** RBAC sổ điểm: giảng viên phụ trách/admin quản lý; sinh viên đang học lớp chỉ xem của mình. */
@Component
@RequiredArgsConstructor
public class GradebookAccess {
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;

    public LmsClass lecturerClass(Long classId, Long actorId, boolean admin) {
        LmsClass item = load(classId);
        if (!admin && !item.getLecturerId().equals(actorId))
            throw new LmsException("FORBIDDEN", "Chỉ giảng viên phụ trách hoặc quản trị viên được quản lý sổ điểm", HttpStatus.FORBIDDEN, null);
        return item;
    }

    public LmsClass studentClass(Long classId, Long studentId) {
        LmsClass item = load(classId);
        if (item.getStatus() == ClassStatus.locked)
            throw new LmsException("CLASS_LOCKED", "Lớp học đang bị khóa", HttpStatus.FORBIDDEN, null);
        if (!enrolled(classId, studentId))
            throw new LmsException("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN, null);
        return item;
    }

    /** Thành viên lớp: admin, giảng viên phụ trách, hoặc sinh viên đang học. */
    public LmsClass memberClass(Long classId, Long actorId, boolean admin, boolean student) {
        return student ? studentClass(classId, actorId) : lecturerClass(classId, actorId, admin);
    }

    public boolean enrolled(Long classId, Long studentId) {
        return enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(classId, studentId, EnrollmentStatus.active);
    }

    private LmsClass load(Long classId) {
        return classes.findById(classId)
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy lớp học", HttpStatus.NOT_FOUND, null));
    }
}
