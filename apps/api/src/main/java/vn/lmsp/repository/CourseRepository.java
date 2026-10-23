package vn.lmsp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.Course;

public interface CourseRepository extends JpaRepository<Course, Long> { }
