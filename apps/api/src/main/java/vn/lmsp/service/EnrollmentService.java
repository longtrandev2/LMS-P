package vn.lmsp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.SortParam;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Ghi danh 1 CHIỀU (FR-CRS-02): chỉ lecturer/admin thêm/xóa SV khỏi lớp; SV không tự ghi danh. */
@Service
public class EnrollmentService {
    private static final Map<String,String> STUDENT_SORT = Map.of("full_name","student.fullName","student_code","student.studentCode","enrolled_at","enrolledAt");
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AuditService audit;
    private final ObjectMapper json;
    public EnrollmentService(ClassRepository classes, EnrollmentRepository enrollments, UserRepository users, AuditService audit, ObjectMapper json) {
        this.classes=classes; this.enrollments=enrollments; this.users=users; this.audit=audit; this.json=json;
    }
    /**
     * Thêm SV theo mã SV/email (hoặc student_id legacy). Body: bare object (lẻ, lỗi capacity → 409),
     * {"students":[...]} hoặc mảng legacy — bulk trả lỗi theo dòng (api-spec §3, BR11).
     */
    @Transactional public EnrollOutcome enroll(Long classId, JsonNode body, Long actorId) {
        LmsClass item = classes.findByIdForUpdate(classId).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
        if (item.getStatus() == ClassStatus.locked) throw failure("VALIDATION_ERROR", "Lớp đã bị khóa", HttpStatus.CONFLICT);
        List<EnrollRow> rows = parseRows(body);
        boolean single = !body.isArray() && !body.has("students");
        int active = (int) enrollments.countByLmsClass_IdAndStatus(classId, EnrollmentStatus.active);
        Integer max = item.getMaxStudents();
        int added = 0; List<RowError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            User student = resolve(rows.get(i));
            int row = i + 1;
            if (student == null) { errors.add(new RowError(row, "ENROLLMENT_INVALID", "Không tìm thấy sinh viên")); continue; }
            if (student.getRoles().stream().noneMatch(role -> role.getName().equals("student"))) {
                errors.add(new RowError(row, "ENROLLMENT_INVALID", "Tài khoản không có vai trò sinh viên")); continue;
            }
            Enrollment enrollment = enrollments.findByLmsClass_IdAndStudent_Id(classId, student.getId()).orElse(null);
            if (enrollment != null && enrollment.getStatus() == EnrollmentStatus.active) {
                errors.add(new RowError(row, "ALREADY_ENROLLED", "Sinh viên đã ở trong lớp")); continue;
            }
            if (max != null && active >= max) {
                if (single) throw failure("CLASS_FULL", "Lớp đã đủ sĩ số tối đa (" + max + ")", HttpStatus.CONFLICT);
                errors.add(new RowError(row, "CLASS_FULL", "Lớp đã đủ sĩ số tối đa (" + max + ")")); continue;
            }
            if (enrollment == null) { enrollments.save(new Enrollment(item, student)); audit.record(actorId,"enrollment.add","class",classId,null,Map.of("student_id",student.getId())); }
            else { enrollment.reactivate(); audit.record(actorId,"enrollment.add","class",classId,Map.of("student_id",student.getId(),"status","dropped"),Map.of("student_id",student.getId(),"status","active")); }
            added++; active++;
        }
        return new EnrollOutcome(added, errors);
    }
    @Transactional public void drop(Long classId, Long studentId,Long actorId) {
        Enrollment item = enrollments.findByLmsClass_IdAndStudent_Id(classId, studentId).orElseThrow(() -> notFound("Không tìm thấy ghi danh")); item.drop();
        audit.record(actorId,"enrollment.remove","class",classId,Map.of("student_id",studentId,"status","active"),Map.of("student_id",studentId,"status","dropped"));
    }
    @Transactional(readOnly=true) public Page<StudentView> students(Long classId, String q, String sort, int page, int limit) {
        clazz(classId);
        var order = SortParam.parse(sort, STUDENT_SORT, SortParam.asc("student.id"));
        var result = enrollments.searchStudents(classId, EnrollmentStatus.active, blank(q), PageRequest.of(page-1, limit, order));
        return new Page<>(result.getContent().stream().map(e -> new StudentView(e.getStudent().getId(),e.getStudent().getEmail(),e.getStudent().getFullName(),e.getStudent().getStudentCode(),e.getStatus().name(),e.getEnrolledAt())).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional(readOnly=true) public Page<MyClassView> myClasses(Long userId, int page, int limit) {
        var result=enrollments.findByStudent_IdOrderByLmsClass_Id(userId,PageRequest.of(page-1,limit));
        return new Page<>(result.getContent().stream().map(e -> { LmsClass c=e.getLmsClass(); return new MyClassView(c.getId(),c.getCourseId(),c.getCode(),c.getName(),c.getSemester(),c.getLecturerId(),e.getStatus().name(),c.getCourse().getCode(),c.getCourse().getName(),c.getLecturer().getFullName()); }).toList(),result.getTotalElements(),page,limit);
    }
    private List<EnrollRow> parseRows(JsonNode body) {
        List<EnrollRow> rows = new ArrayList<>();
        if (body.isArray()) body.forEach(node -> rows.add(row(node)));
        else if (body.has("students")) {
            JsonNode list = body.get("students");
            if (!list.isArray()) throw invalid("students phải là mảng");
            list.forEach(node -> rows.add(row(node)));
        } else rows.add(row(body));
        if (rows.isEmpty()) throw invalid("Cần ít nhất một sinh viên để ghi danh");
        return rows;
    }
    private EnrollRow row(JsonNode node) {
        if (node == null || !node.isObject()) throw invalid("Mỗi dòng ghi danh phải là một object");
        return new EnrollRow(optLong(node.get("student_id")), optText(node.get("student_code")), optText(node.get("email")));
    }
    private User resolve(EnrollRow row) {
        if (row.student_id() != null) return users.findWithRolesById(row.student_id()).orElse(null);
        if (row.student_code() != null && !row.student_code().isBlank()) return users.findByStudentCodeIgnoreCase(row.student_code().trim()).orElse(null);
        if (row.email() != null && !row.email().isBlank()) return users.findByEmailIgnoreCase(row.email().trim()).orElse(null);
        return null;
    }
    private static String optText(JsonNode node) { return node == null || node.isNull() ? null : node.asText(); }
    private static Long optLong(JsonNode node) { return node == null || node.isNull() ? null : node.asLong(); }
    private LmsClass clazz(Long id) { return classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học")); }
    private static String blank(String value) { return value == null || value.isBlank() ? null : value; }
    private static LmsException invalid(String message) { return failure("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST); }
    private static LmsException notFound(String message) { return failure("NOT_FOUND", message, HttpStatus.NOT_FOUND); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
