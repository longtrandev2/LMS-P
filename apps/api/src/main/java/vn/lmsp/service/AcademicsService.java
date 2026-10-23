package vn.lmsp.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
public class AcademicsService {
    private final CourseRepository courses;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AuditService audit;
    public AcademicsService(CourseRepository courses, ClassRepository classes, EnrollmentRepository enrollments, UserRepository users, AuditService audit) {
        this.courses = courses; this.classes = classes; this.enrollments = enrollments; this.users = users; this.audit=audit;
    }
    @Transactional(readOnly=true) public Page<CourseView> courses(int page, int limit) {
        var result = courses.findAll(PageRequest.of(page-1, limit));
        return new Page<>(result.getContent().stream().map(AcademicsService::courseView).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional public CourseView createCourse(CourseInput input, Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name");
        Course item=courses.save(new Course(input.code(), input.name(), input.description(), user(actorId)));
        audit.record(actorId,"course.create","course",item.getId(),null,Map.of("code",item.getCode(),"name",item.getName()));
        return courseView(item);
    }
    @Transactional(readOnly=true) public CourseView course(Long id) { return courseView(courseEntity(id)); }
    @Transactional public CourseView updateCourse(Long id, CourseInput input,Long actorId) {
        Course item = courseEntity(id); Map<String,Object> old=courseSnapshot(item); item.update(input.code(), input.name(), input.description());
        audit.record(actorId,"course.update","course",id,old,courseSnapshot(item)); return courseView(item);
    }
    @Transactional public void deleteCourse(Long id,Long actorId) { Course item=courseEntity(id); courses.delete(item); audit.record(actorId,"course.delete","course",id,Map.of("code",item.getCode()),null); }
    @Transactional(readOnly=true) public Page<ClassView> classes(Long courseId, int page, int limit) {
        PageRequest request=PageRequest.of(page-1,limit,Sort.by("id").ascending());
        var result=courseId==null ? classes.findAll(request) : classes.findByCourse_Id(courseId,request);
        return new Page<>(result.getContent().stream().map(this::classView).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional public ClassView createClass(ClassInput input,Long actorId) {
        requireText(input.code(), "code"); requireText(input.name(), "name"); requireText(input.semester(), "semester");
        LmsClass item=classes.save(new LmsClass(courseEntity(input.course_id()), input.code(), input.name(), input.semester(), lecturer(input.lecturer_id()), input.grade_policy()));
        audit.record(actorId,"class.create","class",item.getId(),null,Map.of("code",item.getCode(),"course_id",item.getCourseId())); return classView(item);
    }
    @Transactional(readOnly=true) public ClassView getClass(Long id, Long userId, boolean unrestricted) {
        LmsClass item = classEntity(id);
        if (!unrestricted && !enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(id, userId, EnrollmentStatus.active)) throw failure("ENROLLMENT_REQUIRED", "Bạn chưa tham gia lớp học", HttpStatus.FORBIDDEN);
        return classView(item);
    }
    @Transactional public ClassView updateClass(Long id, ClassPatch input,Long actorId) {
        LmsClass item = classEntity(id); Map<String,Object> old=classSnapshot(item);
        User lecturer = input.lecturer_id() == null ? null : lecturer(input.lecturer_id());
        item.update(input.code(), input.name(), input.semester(), lecturer, input.grade_policy());
        audit.record(actorId,"class.update","class",id,old,classSnapshot(item)); return classView(item);
    }
    @Transactional public void deleteClass(Long id,Long actorId) { LmsClass item=classEntity(id); classes.delete(item); audit.record(actorId,"class.delete","class",id,Map.of("code",item.getCode()),null); }
    @Transactional public int enroll(Long classId, List<EnrollItem> students,Long actorId) {
        LmsClass item = classEntity(classId); int added = 0;
        for (EnrollItem target : students) {
            User student = user(target.student_id());
            if (student.getRoles().stream().noneMatch(role -> role.getName().equals("student"))) throw failure("VALIDATION_ERROR", "Tài khoản không có vai trò sinh viên", HttpStatus.BAD_REQUEST);
            Enrollment enrollment = enrollments.findByLmsClass_IdAndStudent_Id(classId, student.getId()).orElse(null);
            if (enrollment == null) { enrollments.save(new Enrollment(item, student)); audit.record(actorId,"enrollment.add","class",classId,null,Map.of("student_id",student.getId())); added++; }
            else if (enrollment.getStatus() == EnrollmentStatus.dropped) { enrollment.reactivate(); audit.record(actorId,"enrollment.add","class",classId,Map.of("student_id",student.getId(),"status","dropped"),Map.of("student_id",student.getId(),"status","active")); added++; }
        }
        return added;
    }
    @Transactional public void drop(Long classId, Long studentId,Long actorId) {
        Enrollment item = enrollments.findByLmsClass_IdAndStudent_Id(classId, studentId).orElseThrow(() -> notFound("Không tìm thấy ghi danh")); item.drop();
        audit.record(actorId,"enrollment.remove","class",classId,Map.of("student_id",studentId,"status","active"),Map.of("student_id",studentId,"status","dropped"));
    }
    @Transactional(readOnly=true) public Page<StudentView> students(Long classId, int page, int limit) {
        classEntity(classId); var result=enrollments.findByLmsClass_IdAndStatusOrderByStudent_Id(classId,EnrollmentStatus.active,PageRequest.of(page-1,limit));
        return new Page<>(result.getContent().stream().map(e -> new StudentView(e.getStudent().getId(),e.getStudent().getEmail(),e.getStudent().getFullName(),e.getStudent().getStudentCode(),e.getStatus().name(),e.getEnrolledAt())).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional(readOnly=true) public Page<MyClassView> myClasses(Long userId, int page, int limit) {
        var result=enrollments.findByStudent_IdOrderByLmsClass_Id(userId,PageRequest.of(page-1,limit));
        return new Page<>(result.getContent().stream().map(e -> { LmsClass c=e.getLmsClass(); return new MyClassView(c.getId(),c.getCourseId(),c.getCode(),c.getName(),c.getSemester(),c.getLecturerId(),e.getStatus().name(),c.getCourse().getCode(),c.getCourse().getName(),c.getLecturer().getFullName()); }).toList(),result.getTotalElements(),page,limit);
    }
    private Course courseEntity(Long id) { return courses.findById(id).orElseThrow(() -> notFound("Không tìm thấy khóa học")); }
    private LmsClass classEntity(Long id) { return classes.findById(id).orElseThrow(() -> notFound("Không tìm thấy lớp học")); }
    private User user(Long id) { return users.findWithRolesById(id).orElseThrow(() -> notFound("Không tìm thấy người dùng")); }
    private User lecturer(Long id) { User u=user(id); if (u.getRoles().stream().noneMatch(r -> r.getName().equals("lecturer"))) throw failure("VALIDATION_ERROR", "Tài khoản không có vai trò giảng viên", HttpStatus.BAD_REQUEST); return u; }
    private static CourseView courseView(Course c) { return new CourseView(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getCreatedBy(), c.getCreatedAt()); }
    private static Map<String,Object> courseSnapshot(Course c) { Map<String,Object> v=new LinkedHashMap<>(); v.put("code",c.getCode()); v.put("name",c.getName()); v.put("description",c.getDescription()); return v; }
    private static Map<String,Object> classSnapshot(LmsClass c) { Map<String,Object> v=new LinkedHashMap<>(); v.put("code",c.getCode()); v.put("name",c.getName()); v.put("semester",c.getSemester()); v.put("lecturer_id",c.getLecturerId()); v.put("grade_policy",c.getGradePolicy()); return v; }
    private ClassView classView(LmsClass c) { return new ClassView(c.getId(), c.getCourseId(), c.getCode(), c.getName(), c.getSemester(), c.getLecturerId(), c.getGradePolicy(), c.getCreatedAt(), c.getCourse().getCode(), c.getCourse().getName(), c.getLecturer().getFullName()); }
    private static void requireText(String value, String field) { if (value == null || value.isBlank()) throw failure("VALIDATION_ERROR", field + " là bắt buộc", HttpStatus.BAD_REQUEST); }
    private static LmsException notFound(String message) { return failure("NOT_FOUND", message, HttpStatus.NOT_FOUND); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
