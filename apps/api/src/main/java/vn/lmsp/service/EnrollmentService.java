package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.EnrollmentVia;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.model.Enrollment;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class EnrollmentService {
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AuditService audit;
    private final AcademicsMapper mapper;

    @Transactional
    public EnrollResult enroll(Long classId, List<EnrollTarget> targets, Long actorId, boolean adminOverride) {
        LmsClass clazz = lockedClass(classId); requireManager(clazz, actorId, adminOverride);
        List<EnrollError> errors = new ArrayList<>(); Set<Long> seen = new HashSet<>(); int added = 0; long count = activeCount(classId);
        for (int i = 0; i < targets.size(); i++) {
            EnrollTarget target = targets.get(i); String invalid = validateTarget(target);
            User student = invalid == null ? resolve(target) : null;
            if (invalid == null && student == null) invalid = "Không tìm thấy sinh viên";
            if (invalid == null && !isStudent(student)) invalid = "Tài khoản không có vai trò sinh viên";
            if (invalid == null && student.getStatus() != UserStatus.active) invalid = "Tài khoản sinh viên đang bị khóa";
            if (invalid != null) { errors.add(new EnrollError(i + 1, "ENROLLMENT_INVALID", invalid)); continue; }
            if (!seen.add(student.getId())) { errors.add(new EnrollError(i + 1, "DUPLICATE_ROW", "Sinh viên bị lặp trong danh sách")); continue; }
            if (clazz.getStatus() == ClassStatus.locked) { errors.add(new EnrollError(i + 1, "CLASS_LOCKED", "Lớp học đang bị khóa")); continue; }
            Enrollment existing = enrollments.findByLmsClass_IdAndStudent_Id(classId, student.getId()).orElse(null);
            if (existing != null && existing.getStatus() == EnrollmentStatus.active) { errors.add(new EnrollError(i + 1, "ALREADY_ENROLLED", "Sinh viên đã có trong lớp")); continue; }
            if (clazz.getMaxStudents() != null && count >= clazz.getMaxStudents() && !adminOverride) { errors.add(new EnrollError(i + 1, "CLASS_FULL", "Lớp đã đủ sĩ số")); continue; }
            if (existing == null) enrollments.save(new Enrollment(clazz, student, EnrollmentVia.lecturer));
            else existing.reactivate(EnrollmentVia.lecturer);
            count++; added++;
            audit.record(actorId, "enrollment.add", "class", classId, null, Map.of("student_id", student.getId(), "enrolled_via", "lecturer"));
        }
        return new EnrollResult(added, errors);
    }

    @Transactional(readOnly = true)
    public EnrollPreview previewCsv(Long classId, List<CsvEnrollTarget> targets, Long actorId, boolean admin) {
        LmsClass clazz = classes.findById(classId).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy lớp học", HttpStatus.NOT_FOUND));
        requireManager(clazz, actorId, admin);
        List<PendingCsvRow> checked = evaluateCsv(clazz, targets, admin);
        List<EnrollPreviewRow> rows = checked.stream().map(PendingCsvRow::preview).toList();
        return new EnrollPreview((int) rows.stream().filter(EnrollPreviewRow::valid).count(), rows);
    }

    @Transactional
    public EnrollResult importCsv(Long classId, List<CsvEnrollTarget> targets, Long actorId, boolean admin) {
        LmsClass clazz = lockedClass(classId); requireManager(clazz, actorId, admin);
        List<PendingCsvRow> checked = evaluateCsv(clazz, targets, admin); List<EnrollError> errors = new ArrayList<>(); int added = 0;
        for (PendingCsvRow row : checked) {
            EnrollPreviewRow preview = row.preview();
            if (!preview.valid()) { errors.add(new EnrollError(preview.row(), preview.code(), preview.reason())); continue; }
            User student = row.student(); Enrollment existing = enrollments.findByLmsClass_IdAndStudent_Id(classId, student.getId()).orElse(null);
            if (existing == null) enrollments.save(new Enrollment(clazz, student, EnrollmentVia.lecturer));
            else existing.reactivate(EnrollmentVia.lecturer);
            audit.record(actorId, "enrollment.add", "class", classId, null,
                    Map.of("student_id", student.getId(), "enrolled_via", "lecturer", "source", "csv")); added++;
        }
        return new EnrollResult(added, errors);
    }

    @Transactional
    public void drop(Long classId, Long studentId, Long actorId, boolean admin) {
        LmsClass clazz = lockedClass(classId); requireManager(clazz, actorId, admin);
        Enrollment item = enrollments.findByLmsClass_IdAndStudent_Id(classId, studentId)
                .orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy ghi danh", HttpStatus.NOT_FOUND));
        if (item.getStatus() == EnrollmentStatus.dropped) return;
        item.drop(); audit.record(actorId, "enrollment.remove", "class", classId,
                Map.of("student_id", studentId, "status", "active"), Map.of("student_id", studentId, "status", "dropped"));
    }

    @Transactional(readOnly = true)
    public Page<StudentView> students(Long classId, int page, int limit, String query, String sort, Long actorId, boolean admin) {
        LmsClass clazz = classes.findById(classId).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy lớp học", HttpStatus.NOT_FOUND));
        requireManager(clazz, actorId, admin);
        String field = switch (sort == null ? "" : sort) {
            case "full_name" -> "student.fullName"; case "student_code" -> "student.studentCode";
            case "enrolled_at" -> "enrolledAt"; default -> "student.fullName";
        };
        var result = enrollments.searchRoster(classId, EnrollmentStatus.active, clean(query), PageRequest.of(page - 1, limit, Sort.by(field).ascending()));
        return new Page<>(result.getContent().stream().map(mapper::toStudentView).toList(), result.getTotalElements(), page, limit);
    }

    @Transactional(readOnly = true)
    public Page<StudentCandidateView> candidates(Long classId, int page, int limit, String query, Long actorId, boolean admin) {
        LmsClass clazz = classes.findById(classId).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy lớp học", HttpStatus.NOT_FOUND));
        requireManager(clazz, actorId, admin); String term = clean(query);
        if (term == null || term.length() < 2) return new Page<>(List.of(), 0, page, limit);
        var result = users.searchEnrollCandidates(classId, term, PageRequest.of(page - 1, limit, Sort.by("fullName").ascending()));
        return new Page<>(result.getContent().stream().map(mapper::toStudentCandidateView).toList(), result.getTotalElements(), page, limit);
    }

    @Transactional(readOnly = true)
    public Page<MyClassView> myClasses(Long userId, int page, int limit, String query, String sort) {
        String field = switch (sort == null ? "" : sort) { case "name" -> "lmsClass.name"; case "semester" -> "lmsClass.semester"; default -> "lmsClass.code"; };
        var result = enrollments.searchMyClasses(userId, EnrollmentStatus.active, clean(query), PageRequest.of(page - 1, limit, Sort.by(field).ascending()));
        return new Page<>(result.getContent().stream().map(mapper::toMyClassView).toList(), result.getTotalElements(), page, limit);
    }

    private LmsClass lockedClass(Long id) { return classes.findLockedById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy lớp học", HttpStatus.NOT_FOUND)); }
    private long activeCount(Long id) { return enrollments.countByLmsClass_IdAndStatus(id, EnrollmentStatus.active); }
    private User resolve(EnrollTarget target) {
        return target.studentId() == null ? null : users.findWithRolesById(target.studentId()).orElse(null);
    }
    private List<PendingCsvRow> evaluateCsv(LmsClass clazz, List<CsvEnrollTarget> targets, boolean admin) {
        List<PendingCsvRow> result = new ArrayList<>(); Set<Long> seen = new HashSet<>(); long count = activeCount(clazz.getId());
        if (targets == null) return result;
        for (int i = 0; i < targets.size(); i++) {
            CsvEnrollTarget target = targets.get(i); int row = target == null || target.row() < 2 ? i + 2 : target.row();
            String code = target == null ? null : clean(target.student_code()); String email = target == null ? null : clean(target.email());
            String identifier = code != null ? code : email; String error = null; String errorCode = "ENROLLMENT_INVALID"; User student = null;
            if ((code == null) == (email == null)) error = "Cần đúng một trong mã sinh viên hoặc email";
            else student = code != null ? users.findByStudentCodeIgnoreCase(code).orElse(null) : users.findByEmailIgnoreCase(email).orElse(null);
            if (error == null && student == null) error = "Không tìm thấy sinh viên";
            if (error == null && !isStudent(student)) error = "Tài khoản không có vai trò sinh viên";
            if (error == null && student.getStatus() != UserStatus.active) error = "Tài khoản sinh viên đang bị khóa";
            if (error == null && !seen.add(student.getId())) { error = "Sinh viên bị lặp trong file"; errorCode = "DUPLICATE_ROW"; }
            if (error == null && clazz.getStatus() == ClassStatus.locked) { error = "Lớp học đang bị khóa"; errorCode = "CLASS_LOCKED"; }
            if (error == null && enrollments.findByLmsClass_IdAndStudent_Id(clazz.getId(), student.getId()).filter(e -> e.getStatus() == EnrollmentStatus.active).isPresent()) {
                error = "Sinh viên đã có trong lớp"; errorCode = "ALREADY_ENROLLED";
            }
            if (error == null && clazz.getMaxStudents() != null && count >= clazz.getMaxStudents() && !admin) { error = "Lớp đã đủ sĩ số"; errorCode = "CLASS_FULL"; }
            boolean valid = error == null; if (valid) count++;
            result.add(new PendingCsvRow(new EnrollPreviewRow(row, identifier, student == null ? null : student.getId(),
                    student == null ? null : student.getFullName(), student == null ? null : student.getEmail(),
                    student == null ? null : student.getStudentCode(), valid, valid ? null : errorCode, error), student));
        }
        return result;
    }
    private void requireManager(LmsClass clazz, Long actorId, boolean admin) {
        if (!admin && !clazz.getLecturerId().equals(actorId)) throw failure("FORBIDDEN", "Giảng viên chỉ được quản lý sinh viên trong lớp mình phụ trách", HttpStatus.FORBIDDEN);
    }
    private static String validateTarget(EnrollTarget target) {
        return target == null || target.studentId() == null ? "Cần chọn sinh viên từ kết quả tìm kiếm" : null;
    }
    private static boolean isStudent(User user) { return user.getRoles().stream().anyMatch(role -> role.getName().equals("student")); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String clean(String value) { return blank(value) ? null : value.trim(); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
    private record PendingCsvRow(EnrollPreviewRow preview, User student) { }
}
