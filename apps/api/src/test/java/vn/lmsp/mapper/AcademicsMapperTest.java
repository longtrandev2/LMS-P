package vn.lmsp.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.lmsp.support.DomainFixtures.*;

import org.junit.jupiter.api.Test;
import vn.lmsp.enums.EnrollmentVia;
import vn.lmsp.model.Enrollment;

class AcademicsMapperTest {
    private final AcademicsMapper mapper = new AcademicsMapper();

    @Test void allLecturersAreProjectedInStableOrderWithoutSelectingAPrimaryLecturer() {
        var clazz = clazz(null);
        var other = user(8, "lecturer");
        other.updateProfile("Giảng viên thứ hai", null);
        clazz.assignLecturers(java.util.List.of(other, user(7, "lecturer")));
        var view = mapper.toClassView(clazz, 0);
        assertThat(view.lecturers()).extracting(v -> v.id()).containsExactly(7L, 8L);
        assertThat(view.lecturer_name()).isEqualTo("Demo lecturer, Giảng viên thứ hai");
        var mine = mapper.toMyClassView(new Enrollment(clazz, user(42, "student"), EnrollmentVia.lecturer));
        assertThat(mine.lecturers()).hasSize(2);
        assertThat(mine.lecturer_avatar_url()).isNull();
    }

    @Test
    void unlimitedCapacityHasNoRemainingSeatLimit() {
        var view = mapper.toClassView(clazz(null), 5);

        assertThat(view.enrolled_count()).isEqualTo(5);
        assertThat(view.seats_left()).isNull();
        assertThat(view.course_code()).isEqualTo("CS101");
        assertThat(view.lecturer_name()).isEqualTo("Demo lecturer");
    }

    @Test
    void adminOverflowDisplaysZeroSeatsInsteadOfANegativeValue() {
        assertThat(mapper.toClassView(clazz(2), 3).seats_left()).isZero();
        assertThat(mapper.toClassView(clazz(10), 3).seats_left()).isEqualTo(7);
    }

    @Test
    void droppedEnrollmentRemainsVisibleInTheProjectionAsHistory() {
        var student = user(42, "student");
        var enrollment = new Enrollment(clazz(10), student, EnrollmentVia.lecturer);
        enrollment.drop();

        assertThat(mapper.toStudentView(enrollment).status()).isEqualTo("dropped");
        assertThat(mapper.toMyClassView(enrollment).status()).isEqualTo("dropped");
        assertThat(mapper.toStudentCandidateView(student).student_code()).isEqualTo("SV42");
        assertThat(mapper.toClassReference(enrollment.getLmsClass()).course_name()).isEqualTo("Lập trình");
    }
}
