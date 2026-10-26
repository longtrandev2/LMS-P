package vn.lmsp.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AcademicsService {
    private static final Map<String,String> COURSE_SORT = Map.of("code","code","name","name","created_at","createdAt");
    private static final Map<String,String> CLASS_SORT = Map.of("code","code","name","name","created_at","createdAt");
    private final CourseRepository courses;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AuditService audit;
    public AcademicsService(CourseRepository courses, ClassRepository classes, EnrollmentRepository enrollments, UserRepository users, AuditService audit) {
        this.courses = courses; this.classes = classes; this.enrollments = enrollments; this.users = users; this.audit=audit;
    }
    @Transactional(readOnly=true) public Page<CourseView> courses(String q, String sort, int page, int limit) {
        var order = SortParam.parse(sort, COURSE_SORT, SortParam.asc("id"));
        var result = courses.search(blank(q), pageRequest(page, limit, order));
        return new Page<>(result.getContent().stream().map(AcademicsService::courseView).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional public CourseView createCourse(CourseInput input, Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name");
        Course item=courses.save(new Course(input.code(), input.name(), input.description(), user(actorId)));
        item.update(null, null, null, input.credits());
        audit.record(actorId,"course.create","course",item.getId(),null,Map.of("code",item.getCode(),"name",item.getName()));
        return courseView(item);
    }
    @Transactional(readOnly=true) public CourseView course(Long id) { return courseView(courseEntity(id)); }
    @Transactional public CourseView updateCourse(Long id, CourseInput input,Long actorId) {
        Course item = courseEntity(id); Map<String,Object> old=courseSnapshot(item);
        item.update(input.code(), input.name(), input.description(), input.credits());
        audit.record(actorId,"course.update","course",id,old,courseSnapshot(item)); return courseView(item);
    }
    @Transactional public void deleteCourse(Long id,Long actorId) { Course item=courseEntity(id); courses.delete(item); audit.record(actorId,"course.delete","course",id,Map.of("code",item.getCode()),null); }
    @Transactional(readOnly=true) public Page<ClassView> classes(Long courseId, String semester, String q, String sort, int page, int limit) {
        Sort order=SortParam.parse(sort, CLASS_SORT, SortParam.asc("id"));
        var result=classes.search(courseId, blank(semester), blank(q), pageRequest(page, limit, order));
        return new Page<>(result.getContent().stream().map(this::classView).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional public ClassView createClass(ClassInput input,Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name"); requireText(input.semester(), "semester");
        LmsClass item=classes.save(new LmsClass(courseEntity(input.course_id()), input.code(), input.name(), input.semester(), lecturer(input.lecturer_id()), input.grade_policy()));
        item.update(null, null, null, null, coLecturer(input.co_lecturer_id()), null, input.max_students(), input.room(), classStatus(input.status()));
        audit.record(actorId,"class.create","class",item.getId(),null,Map.of("code",item.getCode(),"course_id",item.getCourseId())); return classView(item);
    }
    @Transactional(readOnly=true) public ClassView getClass(Long id, Long userId, boolean unrestricted) {
        LmsClass item = classEntity(id);
        boolean teacher = item.getLecturerId().equals(userId) || userId.equals(item.getCoLecturerId());
        if (!unrestricted && !teacher && !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(id, userId, EnrollmentStatus.active))
            throw failure("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN);
        return classView(item);
    }
    @Transactional public ClassView updateClass(Long id, ClassPatch input,Long actorId) {
        LmsClass item = classEntity(id); Map<String,Object> old=classSnapshot(item);
        User lecturer = input.lecturer_id() == null ? null : lecturer(input.lecturer_id());
        User coLecturer = input.co_lecturer_id() == null ? null : coLecturer(input.co_lecturer_id());
        ClassStatus status = input.status() == null ? null : classStatus(input.status());
        // BR12: không hạ sĩ số tối đa dưới sĩ số hiện tại
        if (input.max_students() != null && input.max_students() < activeCount(id))
            throw failure("VALIDATION_ERROR", "max_students không được nhỏ hơn sĩ số hiện tại (" + activeCount(id) + ")", HttpStatus.BAD_REQUEST);
        item.update(input.code(), input.name(), input.semester(), lecturer, coLecturer, input.grade_policy(),
                input.max_students(), input.room(), status);
        audit.record(actorId,"class.update","class",id,old,classSnapshot(item)); return classView(item);
    }
    @Transactional public void deleteClass(Long id,Long actorId) { LmsClass item=classEntity(id); classes.delete(item); audit.record(actorId,"class.delete","class",id,Map.of("code",item.getCode()),null); }
    private long activeCount(Long classId) { return enrollments.countByLmsClass_IdAndStatus(classId, EnrollmentStatus.active); }
    private static PageRequest pageRequest(int page, int limit) { return PageRequest.of(page-1, limit); }
    private static PageRequest pageRequest(int page, int limit, Sort sort) { return PageRequest.of(page-1, limit, sort); }
    private Course courseEntity(Long id) { return courses.findById(id).orElseThrow(() -> notFound("Không tìm thấy khóa học")); }
    private LmsClass classEntity(Long id) { return classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học")); }
    private User user(Long id) { return users.findWithRolesById(id).orElseThrow(() -> notFound("Không tìm thấy người dùng")); }
    private User lecturer(Long id) { User u=user(id); if (u.getRoles().stream().noneMatch(r -> r.getName().equals("lecturer"))) throw failure("VALIDATION_ERROR", "Tài khoản không có vai trò giảng viên", HttpStatus.BAD_REQUEST); return u; }
    private User coLecturer(Long id) { return id == null ? null : lecturer(id); }
    private static ClassStatus classStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ClassStatus.valueOf(value); } catch (Exception error) { throw failure("VALIDATION_ERROR", "Trạng thái lớp không hợp lệ: " + value, HttpStatus.BAD_REQUEST); }
    }
    private static CourseView courseView(Course c) { return new CourseView(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getCredits(), c.getCreatedBy(), c.getCreatedAt()); }
    private static Map<String,Object> courseSnapshot(Course c) { Map<String,Object> v=new LinkedHashMap<>(); v.put("code",c.getCode()); v.put("name",c.getName()); v.put("description",c.getDescription()); v.put("credits",c.getCredits()); return v; }
    private static Map<String,Object> classSnapshot(LmsClass c) { Map<String,Object> v=new LinkedHashMap<>(); v.put("code",c.getCode()); v.put("name",c.getName()); v.put("semester",c.getSemester()); v.put("lecturer_id",c.getLecturerId()); v.put("co_lecturer_id",c.getCoLecturerId()); v.put("max_students",c.getMaxStudents()); v.put("room",c.getRoom()); v.put("status",c.getStatus().name()); v.put("grade_policy",c.getGradePolicy()); return v; }
    private ClassView classView(LmsClass c) {
        long enrolled = activeCount(c.getId());
        Integer max = c.getMaxStudents();
        return new ClassView(c.getId(), c.getCourseId(), c.getCode(), c.getName(), c.getSemester(), c.getLecturerId(),
                c.getCoLecturerId(), max, c.getRoom(), c.getStatus().name(), c.getGradePolicy(), c.getCreatedAt(),
                c.getCourse().getCode(), c.getCourse().getName(), c.getLecturer().getFullName(), enrolled, max == null ? null : max - (int) enrolled);
    }
    private static String blank(String value) { return value == null || value.isBlank() ? null : value; }
    private static void requireText(String value, String field) { if (value == null || value.isBlank()) throw failure("VALIDATION_ERROR", field + " là bắt buộc", HttpStatus.BAD_REQUEST); }
    private static LmsException notFound(String message) { return failure("NOT_FOUND", message, HttpStatus.NOT_FOUND); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
