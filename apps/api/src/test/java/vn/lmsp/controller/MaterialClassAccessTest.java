package vn.lmsp.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.TestingAuthenticationToken;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.mapper.MaterialMapper;
import vn.lmsp.repository.*;
import vn.lmsp.service.*;

class MaterialClassAccessTest {
    @TempDir Path storage;

    @Test void allAssignedLecturersReadMaterialsButRemovedLecturerLosesAccess() {
        var classes = mock(ClassRepository.class);
        var materials = mock(MaterialRepository.class);
        var enrollments = mock(EnrollmentRepository.class);
        var clazz = clazz(null);
        clazz.assignLecturers(List.of(user(7, "lecturer"), user(8, "lecturer")));
        clazz.updateEnrollmentSettings(null, null, null, null, null, ClassStatus.locked);
        when(classes.findById(3L)).thenReturn(Optional.of(clazz));
        when(materials.findByLmsClass_IdOrderByCreatedAtDescIdDesc(eq(3L), any())).thenReturn(Page.empty());
        var service = new MaterialService(materials, classes, enrollments, mock(UserRepository.class),
                mock(NotificationService.class), mock(AuditService.class), new MaterialMapper(),
                mock(ClassSessionRepository.class), mock(SettingsProvider.class), mock(MaintenanceGuard.class), storage.toString());
        var controller = new MaterialController(service);
        var lecturer = new TestingAuthenticationToken("8", null, "ROLE_LECTURER");
        assertThat(controller.list(3L, "8", lecturer, 1, 20).items()).isEmpty();
        clazz.assignLecturers(List.of(user(7, "lecturer")));
        assertThatThrownBy(() -> controller.list(3L, "8", lecturer, 1, 20)).extracting("code").isEqualTo("CLASS_LOCKED");
        clazz.updateEnrollmentSettings(null, null, null, null, null, ClassStatus.active);
        assertThatThrownBy(() -> controller.list(3L, "8", lecturer, 1, 20)).extracting("code").isEqualTo("ENROLLMENT_REQUIRED");
        assertThat(controller.list(3L, "1", new TestingAuthenticationToken("1", null, "ROLE_ADMIN"), 1, 20).items()).isEmpty();
    }
}
