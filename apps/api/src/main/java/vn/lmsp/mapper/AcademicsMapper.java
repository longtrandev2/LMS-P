package vn.lmsp.mapper;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.dto.UserManagementDtos.ClassReference;
import vn.lmsp.model.Course;
import vn.lmsp.model.Enrollment;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;

@Component
public class AcademicsMapper {
    public CourseView toCourseView(Course course) {
        return new CourseView(course.getId(), course.getCode(), course.getName(), course.getDescription(),
                course.getCreatedBy(), course.getCreatedAt());
    }

    public ClassView toClassView(LmsClass clazz, long enrolledCount) {
        Integer seatsLeft = clazz.getMaxStudents() == null
                ? null : Math.max(0, clazz.getMaxStudents() - (int) enrolledCount);
        return new ClassView(clazz.getId(), clazz.getCourseId(), clazz.getCode(), clazz.getName(),
                clazz.getSemester(), clazz.getLecturerId(), clazz.getGradePolicy(), clazz.getCreatedAt(),
                clazz.getCourse().getCode(), clazz.getCourse().getName(), clazz.getLecturer().getFullName(),
                clazz.getMaxStudents(), clazz.getEnrollFrom(), clazz.getEnrollUntil(), clazz.getRoom(),
                clazz.getSchedule(), clazz.getStatus(), enrolledCount, seatsLeft);
    }

    public StudentView toStudentView(Enrollment enrollment) {
        User student = enrollment.getStudent();
        return new StudentView(student.getId(), student.getEmail(), student.getFullName(),
                student.getStudentCode(), enrollment.getStatus().name(), enrollment.getEnrolledAt());
    }

    public StudentCandidateView toStudentCandidateView(User student) {
        return new StudentCandidateView(student.getId(), student.getEmail(),
                student.getFullName(), student.getStudentCode());
    }

    public MyClassView toMyClassView(Enrollment enrollment) {
        LmsClass clazz = enrollment.getLmsClass();
        return new MyClassView(clazz.getId(), clazz.getCourseId(), clazz.getCode(), clazz.getName(),
                clazz.getSemester(), clazz.getLecturerId(), enrollment.getStatus().name(),
                clazz.getCourse().getCode(), clazz.getCourse().getName(), clazz.getLecturer().getFullName());
    }

    public ClassReference toClassReference(LmsClass clazz) {
        return new ClassReference(clazz.getId(), clazz.getCode(), clazz.getName(),
                clazz.getCourse().getName(), clazz.getSemester());
    }

    public Map<String, Object> toCourseAuditValue(Course course) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("code", course.getCode());
        value.put("name", course.getName());
        value.put("description", course.getDescription());
        return value;
    }

    public Map<String, Object> toClassAuditValue(LmsClass clazz) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("code", clazz.getCode());
        value.put("name", clazz.getName());
        value.put("semester", clazz.getSemester());
        value.put("lecturer_id", clazz.getLecturerId());
        value.put("grade_policy", clazz.getGradePolicy());
        value.put("max_students", clazz.getMaxStudents());
        value.put("enroll_from", clazz.getEnrollFrom());
        value.put("enroll_until", clazz.getEnrollUntil());
        value.put("room", clazz.getRoom());
        value.put("schedule", clazz.getSchedule());
        value.put("status", clazz.getStatus().name());
        return value;
    }
}
