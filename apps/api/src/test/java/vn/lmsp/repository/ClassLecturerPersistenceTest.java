package vn.lmsp.repository;

import static org.assertj.core.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.model.*;

/** Opt-in MySQL test: point LMS_TEST_DATABASE_URL at an empty, disposable database. */
@DataJpaTest(properties = "spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch=true")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "LMS_TEST_DATABASE_URL", matches = ".+")
class ClassLecturerPersistenceTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("LMS_TEST_DATABASE_URL"));
        properties.add("spring.datasource.username", () -> System.getenv("LMS_TEST_DATABASE_USER"));
        properties.add("spring.datasource.password", () -> System.getenv("LMS_TEST_DATABASE_PASSWORD"));
    }
    @Autowired private TestEntityManager entities;
    @Autowired private ClassRepository classes;
    @Autowired private CourseRepository courses;
    @Autowired private QuestionBankRepository banks;
    @Autowired private RoleRepository roles;

    @Test void assignmentMembershipControlsPagedListsCourseScopesAndSharedBanks() {
        var role = roles.findByName("lecturer").orElseThrow();
        var first = entities.persist(new User("first@test.local", "hash", "First", null, role));
        var second = entities.persist(new User("second@test.local", "hash", "Second", null, role));
        var course = entities.persist(new Course("MULTI", "Multiple lecturers", null, first));
        var bank = entities.persist(new QuestionBank(course, first, "Shared", null, "shared", first));
        var a = new LmsClass(course, "A", "Class A", "2026.1", first, null, null, null, null, null, null, ClassStatus.active);
        a.assignLecturers(List.of(first, second)); entities.persist(a);
        var b = new LmsClass(course, "B", "Class B", "2026.1", first, null, null, null, null, null, null, ClassStatus.active);
        b.assignLecturers(List.of(first, second)); entities.persist(b);
        entities.flush(); entities.clear();

        var page = classes.searchForLecturer(null, course.getId(), "2026.1", second.getId(), PageRequest.of(0, 1));
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().getLecturerIds()).containsExactly(first.getId(), second.getId());
        assertThat(classes.search(null, null, null, PageRequest.of(0, 1)).getTotalElements()).isEqualTo(2);
        assertThat(classes.existsByCourse_IdAndLecturers_Id(course.getId(), second.getId())).isTrue();
        assertThat(classes.existsByIdAndLecturers_Id(a.getId(), second.getId())).isTrue();
        assertThat(classes.findAllByLecturers_IdOrderByIdDesc(second.getId())).hasSize(2);
        assertThat(classes.findOtherLecturers(course.getId(), first.getId())).extracting(User::getId).containsExactly(second.getId());
        assertThat(courses.search(null, second.getId(), PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
        assertThat(banks.findAccessible(second.getId(), false, course.getId())).extracting(QuestionBank::getId).containsExactly(bank.getId());

        classes.findLockedById(a.getId()).orElseThrow().assignLecturers(List.of(entities.find(User.class, first.getId())));
        classes.findLockedById(b.getId()).orElseThrow().assignLecturers(List.of(entities.find(User.class, first.getId())));
        entities.flush(); entities.clear();
        assertThat(classes.searchForLecturer(null, null, null, second.getId(), PageRequest.of(0, 10))).isEmpty();
        assertThat(courses.search(null, second.getId(), PageRequest.of(0, 10))).isEmpty();
        assertThat(banks.findAccessible(second.getId(), false, course.getId())).isEmpty();
        assertThat(classes.existsByIdAndLecturers_Id(a.getId(), second.getId())).isFalse();
    }
}
