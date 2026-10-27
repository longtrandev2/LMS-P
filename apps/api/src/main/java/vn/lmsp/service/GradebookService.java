package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttendanceCounts;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.model.GradeEntry;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.GradeEntryRepository;
import vn.lmsp.repository.UserRepository;
import vn.lmsp.service.AssignmentScoreCollector.CategoryScores;

/**
 * Bảng điểm lớp — `GET /classes/{id}/gradebook`, `GET /me/classes/{id}/grades` (docs/api-spec.md §8). Dữ liệu nạp theo
 * lớp (danh sách lớp, người dùng, điểm danh, điểm nhập, bài tập) nên số truy vấn không tăng theo số sinh viên.
 */
@Service
@RequiredArgsConstructor
public class GradebookService {
    private static final Comparator<User> ROSTER_ORDER = Comparator
            .comparing((User u) -> u.getStudentCode() == null ? "￿" : u.getStudentCode())
            .thenComparing(User::getFullName).thenComparing(User::getId);
    private final GradebookAccess access;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final GradeEntryRepository entries;
    private final AttendanceSummaryProvider attendance;
    private final AssignmentScoreCollector assignmentScores;

    @Transactional(readOnly = true)
    public Gradebook gradebook(Long classId, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin);
        GradePolicy policy = GradePolicyCodec.read(clazz.getGradePolicy());
        return new Gradebook(policy, rows(clazz, policy, null));
    }

    @Transactional(readOnly = true)
    public MyGrades mine(Long classId, Long studentId) {
        LmsClass clazz = access.studentClass(classId, studentId);
        GradePolicy policy = GradePolicyCodec.read(clazz.getGradePolicy());
        return new MyGrades(policy, single(clazz, policy, studentId));
    }

    /** Dòng điểm của một sinh viên đang học (caller đã kiểm tra quyền). */
    @Transactional(readOnly = true)
    public GradeRow row(LmsClass clazz, Long studentId) {
        return single(clazz, GradePolicyCodec.read(clazz.getGradePolicy()), studentId);
    }

    /** Mọi sinh viên đang học, sắp theo mã SV (caller đã kiểm tra quyền). */
    @Transactional(readOnly = true)
    public List<GradeRow> rows(LmsClass clazz) {
        return rows(clazz, GradePolicyCodec.read(clazz.getGradePolicy()), null);
    }

    private GradeRow single(LmsClass clazz, GradePolicy policy, Long studentId) {
        return rows(clazz, policy, studentId).stream().findFirst()
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Sinh viên không thuộc lớp", HttpStatus.NOT_FOUND, null));
    }

    private List<GradeRow> rows(LmsClass clazz, GradePolicy policy, Long onlyStudent) {
        List<User> roster = roster(clazz.getId(), onlyStudent);
        if (roster.isEmpty()) return List.of();
        Map<Long, AttendanceCounts> counts = attendance.countsByStudent(clazz.getId());
        Map<Long, Map<GradeComponent, GradeEntry>> byStudent = new HashMap<>();
        for (GradeEntry entry : entries.findAllByClassId(clazz.getId()))
            byStudent.computeIfAbsent(entry.getStudentId(), ignored -> new EnumMap<>(GradeComponent.class)).put(entry.getComponent(), entry);
        Map<GradeComponent, CategoryScores> scores = assignmentScores.collect(clazz, UtcTime.now());
        List<GradeRow> rows = new ArrayList<>(roster.size());
        for (User student : roster) {
            Map<GradeComponent, GradeEntry> own = byStudent.getOrDefault(student.getId(), Map.of());
            var outcome = GradeCalculator.attendance(counts.get(student.getId()), policy.attendance(), own.get(GradeComponent.ATTENDANCE));
            Map<GradeComponent, ComponentGrade> grades = new EnumMap<>(GradeComponent.class);
            for (GradeComponent component : List.of(GradeComponent.ASSIGNMENT, GradeComponent.MIDTERM, GradeComponent.FINAL)) {
                CategoryScores category = scores.getOrDefault(component, CategoryScores.EMPTY);
                GradeStatus status = category.provisional(student.getId()) ? GradeStatus.PROVISIONAL : GradeStatus.FINAL;
                grades.put(component, GradeCalculator.component(category.average(student.getId()), status, own.get(component)));
            }
            rows.add(GradeCalculator.row(student, grades, outcome, policy.weights()));
        }
        return rows;
    }

    /**
     * Nạp cả lớp một lần (findAllById) kể cả khi chỉ cần một sinh viên: proxy sinh viên trong persistence context được
     * khởi tạo sẵn nên {@link AssignmentResultService} không lazy-load từng người.
     */
    private List<User> roster(Long classId, Long onlyStudent) {
        List<Long> ids = enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(classId, EnrollmentStatus.active).stream()
                .map(e -> e.getStudent().getId()).toList();
        if (ids.isEmpty() || onlyStudent != null && !ids.contains(onlyStudent)) return List.of();
        List<User> loaded = new ArrayList<>(users.findAllById(ids));
        if (onlyStudent != null) loaded.removeIf(u -> !onlyStudent.equals(u.getId()));
        loaded.sort(ROSTER_ORDER);
        return loaded;
    }
}
