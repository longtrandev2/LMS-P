package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.model.Assignment;
import vn.lmsp.repository.GradeEntryRepository;

/**
 * Điều kiện dự thi cuối kỳ — docs/class-schedule-grades-spec.md §5.3, docs/exam-spec.md §2. Cùng quy tắc với sổ điểm
 * ({@link GradeCalculator#attendance}): số buổi nghỉ ≤ `max_absences`, hoặc giảng viên đã ghi đè Chuyên cần.
 */
@Service
@RequiredArgsConstructor
public class ExamEligibilityService {
    private final AttendanceSummaryProvider attendance;
    private final GradeEntryRepository entries;

    public boolean eligible(Assignment assignment, Long studentId) {
        var clazz = assignment.getLmsClass();
        var policy = GradePolicyCodec.read(clazz.getGradePolicy());
        var counts = attendance.countsByStudent(clazz.getId()).get(studentId);
        var override = entries.findByClassIdAndStudentIdAndComponent(clazz.getId(), studentId, GradeComponent.ATTENDANCE)
                .orElse(null);
        return GradeCalculator.attendance(counts, policy.attendance(), override).eligible();
    }

    /** 403 `NOT_ELIGIBLE` khi không đủ điều kiện. */
    public void requireEligible(Assignment assignment, Long studentId) {
        if (!eligible(assignment, studentId))
            throw new LmsException("NOT_ELIGIBLE", "Bạn không đủ điều kiện dự thi do nghỉ quá số buổi cho phép",
                    HttpStatus.FORBIDDEN, null);
    }
}
