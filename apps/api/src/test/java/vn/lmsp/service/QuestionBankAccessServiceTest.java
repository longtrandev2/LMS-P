package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.lmsp.enums.BankPermission;
import vn.lmsp.model.Course;
import vn.lmsp.model.QuestionBank;
import vn.lmsp.model.QuestionBankPermission;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.QuestionBankPermissionRepository;

class QuestionBankAccessServiceTest {
    private final ClassRepository classes = mock(ClassRepository.class);
    private final QuestionBankPermissionRepository permissions = mock(QuestionBankPermissionRepository.class);
    private final QuestionBankAccessService access = new QuestionBankAccessService(classes, permissions);

    @Test void privateBankRequiresGrantAndCurrentTeachingAssignment() {
        var owner = user(7, "lecturer");
        Course course = identified(new Course("JAVA", "Java", null, owner), 2);
        QuestionBank bank = identified(new QuestionBank(course, owner, "OOP", null, "private", owner), 20);
        var viewer = user(9, "lecturer");
        when(classes.existsByCourse_IdAndLecturer_Id(2L, 9L)).thenReturn(true);

        assertThat(access.canView(bank, 9L, false)).isFalse();
        assertThat(access.canEdit(bank, 9L, false)).isFalse();
        when(permissions.findById_BankIdAndId_LecturerId(20L, 9L))
                .thenReturn(Optional.of(new QuestionBankPermission(bank, viewer, BankPermission.view)));
        assertThat(access.canView(bank, 9L, false)).isTrue();
        assertThat(access.canEdit(bank, 9L, false)).isFalse();

        when(classes.existsByCourse_IdAndLecturer_Id(2L, 9L)).thenReturn(false);
        assertThat(access.canView(bank, 9L, false)).isFalse();
    }

    @Test void sharedBankGivesCourseLecturerReadOnlyAccess() {
        var owner = user(7, "lecturer");
        Course course = identified(new Course("JAVA", "Java", null, owner), 2);
        QuestionBank bank = identified(new QuestionBank(course, owner, "Collections", null, "shared", owner), 21);
        when(classes.existsByCourse_IdAndLecturer_Id(2L, 9L)).thenReturn(true);

        assertThat(access.canView(bank, 9L, false)).isTrue();
        assertThat(access.canEdit(bank, 9L, false)).isFalse();
        assertThat(access.canEdit(bank, 7L, false)).isTrue();
    }
}
