package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.model.GradeEntry;
import vn.lmsp.model.User;

/** Công thức sổ điểm thuần (không truy vấn) — docs/class-schedule-grades-spec.md §5.2–5.4. */
public final class GradeCalculator {
    private GradeCalculator() { }

    public record AttendanceOutcome(ComponentGrade grade, AttendanceView view, boolean eligible) { }

    /**
     * Chuyên cần = max(0, 10 − vắng×trừ − muộn×trừ − có phép×trừ) trên các buổi đã điểm danh, không hủy.
     * Chưa có bản ghi điểm danh nào → missing; còn buổi chưa diễn ra → provisional. Nghỉ (có phép + không phép)
     * vượt `max_absences` → không đủ điều kiện, trừ khi giảng viên đã ghi đè Chuyên cần (xét lại).
     */
    public static AttendanceOutcome attendance(AttendanceCounts c, AttendancePolicy policy, GradeEntry entry) {
        AttendanceCounts counts = c == null ? new AttendanceCounts(0, 0, 0, 0, 0, 0) : c;
        int marked = counts.present() + counts.late() + counts.excused() + counts.absent();
        int maxAbsences = policy.max_absences() != null ? policy.max_absences() : counts.total() / 5;
        BigDecimal system = null;
        GradeStatus status = GradeStatus.MISSING;
        if (marked > 0) {
            BigDecimal deduction = policy.absent_penalty().multiply(BigDecimal.valueOf(counts.absent()))
                    .add(policy.late_penalty().multiply(BigDecimal.valueOf(counts.late())))
                    .add(policy.excused_penalty().multiply(BigDecimal.valueOf(counts.excused())));
            system = GradeScale.round2(BigDecimal.TEN.subtract(deduction).max(BigDecimal.ZERO));
            status = counts.total() > marked + counts.unmarked() ? GradeStatus.PROVISIONAL : GradeStatus.FINAL;
        }
        boolean eligible = entry != null || counts.absences() <= maxAbsences;
        AttendanceView view = new AttendanceView(counts.total(), counts.present(), counts.late(), counts.excused(),
                counts.absent(), counts.unmarked(), maxAbsences);
        return new AttendanceOutcome(component(system, status, entry), view, eligible);
    }

    /** Điểm nhập (ghi đè/CSV/kỳ thi) thắng điểm hệ thống. */
    public static ComponentGrade component(BigDecimal system, GradeStatus systemStatus, GradeEntry entry) {
        if (entry == null) return new ComponentGrade(system, system, null, system == null ? GradeStatus.MISSING : systemStatus);
        OverrideView override = new OverrideView(GradeScale.round2(entry.getScore()), entry.getReason(), entry.getSource(), entry.getUpdatedAt());
        return new ComponentGrade(override.score(), system, override, GradeStatus.FINAL);
    }

    /** Tổng kết một sinh viên; không đủ điều kiện dự thi → Cuối kỳ hiệu lực = 0. */
    public static GradeRow row(User student, Map<GradeComponent, ComponentGrade> grades, AttendanceOutcome attendance, Weights weights) {
        Map<GradeComponent, ComponentGrade> effective = new EnumMap<>(grades);
        effective.put(GradeComponent.ATTENDANCE, attendance.grade());
        if (!attendance.eligible()) {
            ComponentGrade fin = effective.get(GradeComponent.FINAL);
            effective.put(GradeComponent.FINAL, new ComponentGrade(BigDecimal.ZERO.setScale(2), fin == null ? null : fin.system_score(),
                    fin == null ? null : fin.override(), GradeStatus.FINAL));
        }
        Map<GradeComponent, BigDecimal> scores = new EnumMap<>(GradeComponent.class);
        Map<String, ComponentGrade> views = new LinkedHashMap<>();
        boolean allFinal = true;
        for (GradeComponent component : GradeComponent.values()) {
            ComponentGrade grade = effective.getOrDefault(component, new ComponentGrade(null, null, null, GradeStatus.MISSING));
            views.put(component.value(), grade);
            if (grade.score() != null) scores.put(component, grade.score());
            allFinal &= grade.status() == GradeStatus.FINAL;
        }
        BigDecimal total10 = GradeScale.total10(scores, weights);
        GradeScale.Converted converted = total10 == null ? null : GradeScale.convert(total10);
        return new GradeRow(student.getId(), student.getStudentCode(), student.getFullName(), views, attendance.view(),
                attendance.eligible(), total10, converted == null ? null : converted.total4(),
                converted == null ? null : converted.letter(), converted == null ? null : converted.passed(),
                allFinal ? GradeStatus.FINAL : GradeStatus.PROVISIONAL);
    }

    public static String label(GradeComponent component) {
        return switch (component) {
            case ATTENDANCE -> "Chuyên cần";
            case ASSIGNMENT -> "Bài tập";
            case MIDTERM -> "Giữa kỳ";
            case FINAL -> "Cuối kỳ";
        };
    }
}
