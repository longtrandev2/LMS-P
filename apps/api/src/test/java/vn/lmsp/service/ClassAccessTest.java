package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.EnrollmentRepository;

class ClassAccessTest {
    private final ClassRepository classes = mock(ClassRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final ClassAccess access = new ClassAccess(classes, enrollments);
    private final LmsClass clazz = clazz(null);

    @Test void responsibleLecturerAndAdminManageButOtherLecturersDoNot() {
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        assertThat(access.manage(3L, 7L, false)).isSameAs(clazz);
        assertThat(access.manage(3L, 1L, true)).isSameAs(clazz);
        assertThatThrownBy(() -> access.manage(3L, 8L, false)).isInstanceOf(LmsException.class)
                .extracting("code").isEqualTo("FORBIDDEN");
    }

    @Test void activeStudentIsAMemberWithoutManagementRights() {
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(3L, 42L, EnrollmentStatus.active)).thenReturn(true);
        assertThat(access.member(3L, 42L, false).manager()).isFalse();
        assertThat(access.member(3L, 7L, false).manager()).isTrue();
        assertThatThrownBy(() -> access.member(3L, 43L, false)).extracting("code").isEqualTo("ENROLLMENT_REQUIRED");
    }

    @Test void lockedClassBlocksStudents() {
        clazz.updateEnrollmentSettings(null, null, null, null, null, ClassStatus.locked);
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(3L, 42L, EnrollmentStatus.active)).thenReturn(true);
        assertThatThrownBy(() -> access.member(3L, 42L, false)).extracting("code").isEqualTo("CLASS_LOCKED");
    }

    @Test void missingClassIsNotFound() {
        when(classes.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> access.member(9L, 42L, false)).extracting("code").isEqualTo("NOT_FOUND");
    }
}
