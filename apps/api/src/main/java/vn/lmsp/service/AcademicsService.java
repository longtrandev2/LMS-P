package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.model.Course;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.CourseRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.UserRepository;

@Service
public class AcademicsService {
    private final CourseRepository courses;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AuditService audit;
    private final AcademicsMapper mapper;

    public AcademicsService(CourseRepository courses, ClassRepository classes, EnrollmentRepository enrollments,
                            UserRepository users, AuditService audit, AcademicsMapper mapper) {
        this.courses = courses; this.classes = classes; this.enrollments = enrollments; this.users = users; this.audit = audit; this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Page<CourseView> courses(int page, int limit, String query, String sort, Long actorId, boolean admin) {
        String field = "created_at".equals(sort) ? "createdAt" : sort;
        var result = courses.search(clean(query), admin ? null : actorId, pageRequest(page, limit, field, List.of("code", "name", "createdAt")));
        return new Page<>(result.getContent().stream().map(mapper::toCourseView).toList(), result.getTotalElements(), page, limit);
    }

    @Transactional
    public CourseView createCourse(CourseInput input, Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name");
        Course item = courses.save(new Course(input.code().trim(), input.name().trim(), input.description(), user(actorId)));
        audit.record(actorId, "course.create", "course", item.getId(), null, Map.of("code", item.getCode(), "name", item.getName()));
        return mapper.toCourseView(item);
    }

    @Transactional(readOnly = true)
    public CourseView course(Long id, Long actorId, boolean admin) {
        Course item = courseEntity(id);
        if (!admin && !classes.existsByCourse_IdAndLecturer_Id(id, actorId)) throw forbidden();
        return mapper.toCourseView(item);
    }

    @Transactional
    public CourseView updateCourse(Long id, CourseInput input, Long actorId) {
        Course item = courseEntity(id); Map<String, Object> old = mapper.toCourseAuditValue(item);
        item.update(input.code(), input.name(), input.description());
        audit.record(actorId, "course.update", "course", id, old, mapper.toCourseAuditValue(item));
        return mapper.toCourseView(item);
    }

    @Transactional
    public void deleteCourse(Long id, Long actorId) {
        Course item = courseEntity(id); courses.delete(item);
        audit.record(actorId, "course.delete", "course", id, Map.of("code", item.getCode()), null);
    }

    @Transactional(readOnly = true)
    public Page<ClassView> classes(Long courseId, String semester, String query, String sort, int page, int limit, Long actorId, boolean admin) {
        String field = "created_at".equals(sort) ? "createdAt" : sort;
        var pageable = pageRequest(page, limit, field, List.of("code", "name", "createdAt"));
        var result = admin ? classes.search(clean(query), courseId, clean(semester), pageable)
                : classes.searchForLecturer(clean(query), courseId, clean(semester), actorId, pageable);
        Map<Long, Long> counts = enrollmentCounts(result.getContent().stream().map(LmsClass::getId).toList());
        return new Page<>(result.getContent().stream().map(c -> mapper.toClassView(c, counts.getOrDefault(c.getId(), 0L))).toList(), result.getTotalElements(), page, limit);
    }

    @Transactional
    public ClassView createClass(ClassInput input, Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name"); requireText(input.semester(), "semester");
        validateSettings(input.max_students(), input.enroll_from(), input.enroll_until(), input.room(), input.schedule(), 0);
        LmsClass item = classes.save(new LmsClass(courseEntity(input.course_id()), input.code().trim(), input.name().trim(),
                input.semester().trim(), lecturer(input.lecturer_id()), input.grade_policy(), input.max_students(),
                input.enroll_from(), input.enroll_until(), input.room(), input.schedule(), input.status()));
        audit.record(actorId, "class.create", "class", item.getId(), null, mapper.toClassAuditValue(item));
        return mapper.toClassView(item, 0);
    }

    @Transactional(readOnly = true)
    public ClassView getClass(Long id, Long userId, boolean admin, boolean lecturerRole) {
        LmsClass item = classEntity(id);
        if (lecturerRole && !admin && !item.getLecturerId().equals(userId)) throw forbidden();
        boolean unrestricted = admin || lecturerRole;
        if (!unrestricted && item.getStatus() == ClassStatus.locked) throw failure("CLASS_LOCKED", "Lớp học đang bị khóa", HttpStatus.FORBIDDEN);
        if (!unrestricted && !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(id, userId, EnrollmentStatus.active))
            throw failure("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN);
        return mapper.toClassView(item, enrollments.countByLmsClass_IdAndStatus(id, EnrollmentStatus.active));
    }

    @Transactional
    public ClassView updateClass(Long id, ClassPatch input, Long actorId) {
        LmsClass item = classes.findLockedById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học"));
        long currentCount = enrollments.countByLmsClass_IdAndStatus(id, EnrollmentStatus.active);
        Integer capacity = Boolean.TRUE.equals(input.clear_capacity()) ? null : input.max_students() == null ? item.getMaxStudents() : input.max_students();
        LocalDateTime from = Boolean.TRUE.equals(input.clear_enroll_from()) ? null : input.enroll_from() == null ? item.getEnrollFrom() : input.enroll_from();
        LocalDateTime until = Boolean.TRUE.equals(input.clear_enroll_until()) ? null : input.enroll_until() == null ? item.getEnrollUntil() : input.enroll_until();
        String room = input.room() == null ? item.getRoom() : nullableText(input.room());
        String schedule = input.schedule() == null ? item.getSchedule() : nullableText(input.schedule());
        validateSettings(capacity, from, until, room, schedule, currentCount);
        Map<String, Object> old = mapper.toClassAuditValue(item);
        User lecturer = input.lecturer_id() == null ? null : lecturer(input.lecturer_id());
        item.update(input.code(), input.name(), input.semester(), lecturer, input.grade_policy(), input.max_students(),
                input.enroll_from(), input.enroll_until(), input.room(), input.schedule(), input.status());
        item.updateEnrollmentSettings(capacity, from, until, room, schedule, input.status() == null ? item.getStatus() : input.status());
        audit.record(actorId, "class.update", "class", id, old, mapper.toClassAuditValue(item));
        return mapper.toClassView(item, currentCount);
    }

    @Transactional
    public ClassView adminUpdateClass(Long id, ClassPatch input, Long actorId) { return updateClass(id, input, actorId); }

    @Transactional
    public void deleteClass(Long id, Long actorId) {
        LmsClass item = classEntity(id); classes.delete(item);
        audit.record(actorId, "class.delete", "class", id, Map.of("code", item.getCode()), null);
    }

    private Map<Long, Long> enrollmentCounts(List<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<Long, Long> counts = new LinkedHashMap<>();
        enrollments.countByClassIds(ids, EnrollmentStatus.active).forEach(c -> counts.put(c.getClassId(), c.getEnrollmentCount()));
        return counts;
    }

    private static PageRequest pageRequest(int page, int limit, String sort, List<String> allowed) {
        String field = allowed.contains(sort) ? sort : allowed.get(0);
        return PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.ASC, field).and(Sort.by("id").ascending()));
    }

    private Course courseEntity(Long id) { return courses.findById(id).orElseThrow(() -> notFound("Không tìm thấy khóa học")); }
    private LmsClass classEntity(Long id) { return classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học")); }
    private User user(Long id) { return users.findWithRolesById(id).orElseThrow(() -> notFound("Không tìm thấy người dùng")); }
    private User lecturer(Long id) {
        User value = user(id);
        if (value.getRoles().stream().noneMatch(r -> r.getName().equals("lecturer"))) throw failure("VALIDATION_ERROR", "Tài khoản không có vai trò giảng viên", HttpStatus.BAD_REQUEST);
        return value;
    }
    private static void validateSettings(Integer capacity, LocalDateTime from, LocalDateTime until, String room, String schedule, long count) {
        if (capacity != null && capacity < count) throw failure("VALIDATION_ERROR", "Sức chứa không được thấp hơn sĩ số hiện tại", HttpStatus.BAD_REQUEST);
        if (capacity != null && capacity < 1) throw failure("VALIDATION_ERROR", "Sức chứa phải lớn hơn 0", HttpStatus.BAD_REQUEST);
        if (from != null && until != null && !until.isAfter(from)) throw failure("VALIDATION_ERROR", "Thời gian kết thúc ghi danh phải sau thời gian bắt đầu", HttpStatus.BAD_REQUEST);
        if (room != null && room.length() > 50 || schedule != null && schedule.length() > 100) throw failure("VALIDATION_ERROR", "Phòng học hoặc lịch học quá dài", HttpStatus.BAD_REQUEST);
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String nullableText(String value) { return value.isBlank() ? null : value.trim(); }
    private static void requireText(String value, String field) { if (value == null || value.isBlank()) throw failure("VALIDATION_ERROR", field + " là bắt buộc", HttpStatus.BAD_REQUEST); }
    private static LmsException notFound(String message) { return failure("NOT_FOUND", message, HttpStatus.NOT_FOUND); }
    private static LmsException forbidden() { return failure("FORBIDDEN", "Chỉ quản trị viên hoặc giảng viên được phân công mới có quyền truy cập", HttpStatus.FORBIDDEN); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
