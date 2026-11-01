package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.*;

class ClassLecturerServiceTest {
    private final CourseRepository courses = mock(CourseRepository.class);
    private final ClassRepository classes = mock(ClassRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final AcademicsService service = new AcademicsService(courses, classes, enrollments, users, audit, new AcademicsMapper());
    private final LmsClass clazz = clazz(null);

    @BeforeEach void setup() {
        when(courses.findById(2L)).thenReturn(Optional.of(clazz.getCourse()));
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(classes.findLockedById(3L)).thenReturn(Optional.of(clazz));
        when(classes.save(any())).thenAnswer(call -> identified(call.getArgument(0), 3));
        when(users.findWithRolesById(7L)).thenReturn(Optional.of(user(7, "lecturer")));
        when(users.findWithRolesById(8L)).thenReturn(Optional.of(user(8, "lecturer")));
    }

    @Test void createsClassWithAllLecturersAndAuditsTheWholeAssignment() {
        var view = service.createClass(input(List.of(8L, 7L)), 1L);
        assertThat(view.lecturers()).extracting(LecturerView::id).containsExactly(7L, 8L);
        verify(audit).record(eq(1L), eq("class.create"), eq("class"), eq(3L), isNull(),
                argThat(after -> after.get("lecturer_ids").equals(List.of(7L, 8L))));
    }

    @Test void rejectsEmptyDuplicateMissingAndInvalidLecturers() {
        for (List<Long> ids : List.of(List.<Long>of(), List.of(7L, 7L), Arrays.asList(7L, null), List.of(-1L)))
            assertThatThrownBy(() -> service.createClass(input(ids), 1L)).extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatThrownBy(() -> service.createClass(input(null), 1L)).extracting("code").isEqualTo("VALIDATION_ERROR");
        when(users.findWithRolesById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createClass(input(List.of(9L)), 1L)).extracting("code").isEqualTo("NOT_FOUND");
        when(users.findWithRolesById(9L)).thenReturn(Optional.of(user(9, "student")));
        assertThatThrownBy(() -> service.createClass(input(List.of(9L)), 1L)).extracting("code").isEqualTo("VALIDATION_ERROR");
        verify(classes, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test void rejectsNewLockedLecturerButAllowsRetainingExistingOne() {
        var locked = user(8, "lecturer"); locked.setStatus(UserStatus.locked);
        when(users.findWithRolesById(8L)).thenReturn(Optional.of(locked));
        assertThatThrownBy(() -> service.updateClass(3L, patch(List.of(7L, 8L)), 1L))
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThat(clazz.getLecturerIds()).containsExactly(7L);
        clazz.assignLecturers(List.of(locked));
        assertThat(service.updateClass(3L, patch(List.of(8L, 7L)), 1L).lecturers()).hasSize(2);
    }

    @Test void replacementRevokesRemovedLecturerAndKeepsOtherManagementRights() {
        clazz.assignLecturers(List.of(user(7, "lecturer"), user(8, "lecturer")));
        var access = new ClassAccess(classes, enrollments);
        var assignments = new AssignmentAccess(mock(AssignmentRepository.class), classes, enrollments);
        var grades = new GradebookAccess(classes, enrollments);
        assertThat(access.manage(3L, 8L, false)).isSameAs(clazz);
        assertThat(assignments.lecturerClass(3L, 8L, false)).isSameAs(clazz);
        assertThat(grades.lecturerClass(3L, 8L, false)).isSameAs(clazz);
        service.updateClass(3L, patch(List.of(8L)), 1L);
        assertThat(service.getClass(3L, 8L, false, true).lecturers()).hasSize(1);
        assertThatThrownBy(() -> access.manage(3L, 7L, false)).extracting("code").isEqualTo("FORBIDDEN");
        assertThatThrownBy(() -> assignments.lecturerClass(3L, 7L, false)).extracting("code").isEqualTo("FORBIDDEN");
        assertThatThrownBy(() -> grades.lecturerClass(3L, 7L, false)).extracting("code").isEqualTo("FORBIDDEN");
        assertThatThrownBy(() -> service.getClass(3L, 7L, false, true)).extracting("code").isEqualTo("FORBIDDEN");
        verify(audit).record(eq(1L), eq("class.update"), eq("class"), eq(3L),
                argThat(before -> before.get("lecturer_ids").equals(List.of(7L, 8L))),
                argThat(after -> after.get("lecturer_ids").equals(List.of(8L))));
    }

    @Test void patchWithoutAssignmentsPreservesThemAndEmptyReplacementIsRejected() {
        clazz.assignLecturers(List.of(user(7, "lecturer"), user(8, "lecturer")));
        service.updateClass(3L, patch(null), 1L);
        assertThat(clazz.getLecturerIds()).containsExactly(7L, 8L);
        assertThatThrownBy(() -> service.updateClass(3L, patch(List.of()), 1L))
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThat(clazz.getLecturerIds()).containsExactly(7L, 8L);
    }

    private static ClassInput input(List<Long> ids) {
        return new ClassInput(2L, "CS101-02", "Lớp 02", "2026.1", ids, null, null, null, null, null, null, null);
    }
    private static ClassPatch patch(List<Long> ids) {
        return new ClassPatch(null, null, null, ids, null, null, null, null, null, null, null, null, null, null);
    }
}
