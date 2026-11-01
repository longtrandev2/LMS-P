package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;
import vn.lmsp.model.GradeEntry;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.GradeEntryRepository;
import vn.lmsp.repository.UserRepository;

/**
 * Nhập điểm Giữa kỳ/Cuối kỳ (docs/api-spec.md §8): preview kiểm tra từng dòng, không ghi DB; confirm ghi các dòng hợp lệ
 * làm điểm nhập `source=csv` (thay điểm nhập trước đó của thành phần đó), ghi audit `grade.import`, thông báo `grade.updated`.
 */
@Service
@RequiredArgsConstructor
public class GradeImportService {
    private final GradebookAccess access;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final GradeEntryRepository entries;
    private final AuditService audit;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public ImportPreview preview(Long classId, ImportInput input, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin);
        List<ImportRowResult> rows = GradeImportValidator.validate(input.rows(), roster(clazz.getId()));
        return new ImportPreview((int) rows.stream().filter(ImportRowResult::valid).count(), rows);
    }

    @Transactional
    public ImportResult confirm(Long classId, ImportInput input, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin);
        Map<String, User> roster = roster(classId);
        List<ImportRowResult> rows = GradeImportValidator.validate(input.rows(), roster);
        Map<String, GradeEntry> existing = new HashMap<>();
        entries.findAllByClassId(classId).forEach(e -> existing.put(key(e.getStudentId(), e.getComponent()), e));
        List<Map<String, Object>> before = new ArrayList<>(), after = new ArrayList<>();
        Set<Long> touched = new LinkedHashSet<>();
        int imported = 0;
        for (ImportRowResult row : rows) {
            if (!row.valid()) continue;
            Long studentId = roster.get(GradeImportValidator.normalize(row.student_code())).getId();
            write(classId, studentId, GradeComponent.MIDTERM, row.midterm(), actorId, existing, before, after);
            write(classId, studentId, GradeComponent.FINAL, row.finalExam(), actorId, existing, before, after);
            touched.add(studentId);
            imported++;
        }
        if (imported > 0) {
            Map<String, Object> oldValue = new LinkedHashMap<>(), newValue = new LinkedHashMap<>();
            oldValue.put("entries", before);
            newValue.put("imported", imported); newValue.put("entries", after);
            audit.record(actorId, "grade.import", "class", classId, oldValue, newValue);
            for (Long studentId : touched)
                notifications.create(studentId, "grade.updated", "Điểm đã được cập nhật",
                        "Lớp " + clazz.getCode() + ": điểm Giữa kỳ/Cuối kỳ đã được cập nhật", Map.of("class_id", classId));
        }
        return new ImportResult(imported, rows.stream().filter(r -> !r.valid()).toList());
    }

    private void write(Long classId, Long studentId, GradeComponent component, BigDecimal score, Long actorId,
                       Map<String, GradeEntry> existing, List<Map<String, Object>> before, List<Map<String, Object>> after) {
        if (score == null) return;
        GradeEntry entry = existing.get(key(studentId, component));
        if (entry != null) before.add(audit(entry.getStudentId(), component, entry.getScore(), entry.getSource()));
        else entry = new GradeEntry(classId, studentId, component);
        entry.record(score.setScale(2), GradeSource.csv, null, actorId);
        entries.save(entry);
        after.add(audit(studentId, component, entry.getScore(), GradeSource.csv));
    }

    /** Sinh viên đang học lớp theo mã SV đã chuẩn hóa; nạp người dùng bằng một truy vấn. */
    private Map<String, User> roster(Long classId) {
        List<Long> ids = enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(classId, EnrollmentStatus.active).stream()
                .map(e -> e.getStudent().getId()).toList();
        Map<String, User> byCode = new HashMap<>();
        if (ids.isEmpty()) return byCode;
        for (User user : users.findAllById(ids))
            if (user.getStudentCode() != null) byCode.put(GradeImportValidator.normalize(user.getStudentCode()), user);
        return byCode;
    }

    private static String key(Long studentId, GradeComponent component) { return studentId + ":" + component.value(); }

    private static Map<String, Object> audit(Long studentId, GradeComponent component, BigDecimal score, GradeSource source) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("student_id", studentId); value.put("component", component.value());
        value.put("score", score); value.put("source", source.name());
        return value;
    }
}
