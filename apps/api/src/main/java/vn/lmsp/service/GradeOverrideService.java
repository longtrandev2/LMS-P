package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.GradebookDtos.GradeRow;
import vn.lmsp.dto.GradebookDtos.OverrideInput;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;
import vn.lmsp.model.GradeEntry;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.GradeEntryRepository;

/** `PUT /classes/{id}/grades/{studentId}/{component}` — ghi đè/xóa ghi đè một thành phần (docs/api-spec.md §8). */
@Service
@RequiredArgsConstructor
public class GradeOverrideService {
    private final GradebookAccess access;
    private final GradeEntryRepository entries;
    private final GradebookService gradebook;
    private final AuditService audit;
    private final NotificationService notifications;

    @Transactional
    public GradeRow override(Long classId, Long studentId, String componentValue, OverrideInput input, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin);
        GradeComponent component = parse(componentValue);
        if (!access.enrolled(classId, studentId))
            throw new LmsException("NOT_FOUND", "Sinh viên không thuộc lớp", HttpStatus.NOT_FOUND, null);
        BigDecimal score = validScore(input.score());
        String reason = input.reason() == null ? null : input.reason().trim();
        if (score != null && (reason == null || reason.isEmpty()))
            throw validation("reason", "Vui lòng nhập lý do ghi đè điểm");
        if (reason != null && reason.length() > 500) throw validation("reason", "Lý do tối đa 500 ký tự");
        GradeEntry existing = entries.findByClassIdAndStudentIdAndComponent(classId, studentId, component).orElse(null);
        Map<String, Object> before = snapshot(studentId, component, existing);
        if (score == null) {
            if (existing != null) entries.delete(existing);
        } else {
            GradeEntry entry = existing != null ? existing : new GradeEntry(classId, studentId, component);
            entry.record(score, GradeSource.manual, reason, actorId);
            entries.save(entry);
        }
        Map<String, Object> after = score == null ? null : snapshotOf(studentId, component, score, GradeSource.manual, reason);
        if (existing != null || score != null) {
            audit.record(actorId, "grade.override", "class", classId, before, after);
            notifications.create(studentId, "grade.updated", "Điểm đã được cập nhật",
                    "Lớp " + clazz.getCode() + ": điểm " + GradeCalculator.label(component) + " đã được cập nhật",
                    Map.of("class_id", classId, "component", component.value()));
        }
        entries.flush();
        return gradebook.row(clazz, studentId);
    }

    static GradeComponent parse(String value) {
        try {
            return GradeComponent.fromValue(value);
        } catch (IllegalArgumentException error) {
            throw validation("component", "Thành phần điểm không hợp lệ");
        }
    }

    /** 0–10, bước 0,1; null = xóa ghi đè. */
    static BigDecimal validScore(BigDecimal score) {
        if (score == null) return null;
        if (score.signum() < 0 || score.compareTo(BigDecimal.TEN) > 0) throw validation("score", "Điểm phải từ 0 đến 10");
        if (score.stripTrailingZeros().scale() > 1) throw validation("score", "Điểm lẻ tối đa 0,1");
        return score.setScale(2);
    }

    private static Map<String, Object> snapshot(Long studentId, GradeComponent component, GradeEntry entry) {
        return entry == null ? null : snapshotOf(studentId, component, entry.getScore(), entry.getSource(), entry.getReason());
    }

    private static Map<String, Object> snapshotOf(Long studentId, GradeComponent component, BigDecimal score,
                                                  GradeSource source, String reason) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("student_id", studentId); value.put("component", component.value());
        value.put("score", score); value.put("source", source.name()); value.put("reason", reason);
        return value;
    }

    private static LmsException validation(String field, String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, Map.of(field, message));
    }
}
