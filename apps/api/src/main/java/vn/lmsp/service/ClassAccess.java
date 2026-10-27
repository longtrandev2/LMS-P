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

/**
 * RBAC cho lịch học/điểm danh/đơn xin nghỉ: quản lý = giảng viên phụ trách lớp hoặc admin;
 * thành viên = quản lý hoặc sinh viên đang học lớp (lớp không bị khóa).
 */
@Component
@RequiredArgsConstructor
public class ClassAccess {
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;

    /** manager=false nghĩa là người gọi là sinh viên đang học lớp. */
    public record Member(LmsClass clazz, boolean manager) { }

    public LmsClass find(Long classId) {
        return classes.findById(classId).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
    }

    public LmsClass manage(Long classId, Long actor, boolean admin) {
        LmsClass clazz = find(classId); requireManager(clazz, actor, admin); return clazz;
    }

    /** Khóa dòng lớp để tuần tự hóa các thay đổi lịch (đánh số buổi ổn định). */
    public LmsClass manageLocked(Long classId, Long actor, boolean admin) {
        LmsClass clazz = classes.findLockedById(classId).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
        requireManager(clazz, actor, admin); return clazz;
    }

    public boolean isManager(LmsClass clazz, Long actor, boolean admin) {
        return admin || clazz.getLecturerId().equals(actor);
    }

    public void requireManager(LmsClass clazz, Long actor, boolean admin) {
        if (!isManager(clazz, actor, admin))
            throw new LmsException("FORBIDDEN", "Chỉ giảng viên phụ trách lớp hoặc quản trị viên mới được thực hiện", HttpStatus.FORBIDDEN, null);
    }

    public Member member(Long classId, Long actor, boolean admin) { return member(find(classId), actor, admin); }

    public Member member(LmsClass clazz, Long actor, boolean admin) {
        if (isManager(clazz, actor, admin)) return new Member(clazz, true);
        requireStudent(clazz, actor);
        return new Member(clazz, false);
    }

    public void requireStudent(LmsClass clazz, Long studentId) {
        if (clazz.getStatus() == ClassStatus.locked)
            throw new LmsException("CLASS_LOCKED", "Lớp học đang bị khóa", HttpStatus.FORBIDDEN, null);
        if (!enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(clazz.getId(), studentId, EnrollmentStatus.active))
            throw new LmsException("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN, null);
    }

    static LmsException notFound(String message) { return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null); }
}
