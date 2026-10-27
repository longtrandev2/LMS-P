package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.dto.GradebookDtos.OverrideInput;
import vn.lmsp.enums.GradeComponent;
import vn.lmsp.enums.GradeSource;
import vn.lmsp.model.GradeEntry;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.GradeEntryRepository;

class GradeOverrideServiceTest {
    private final GradebookAccess access = mock(GradebookAccess.class);
    private final GradeEntryRepository entries = mock(GradeEntryRepository.class);
    private final GradebookService gradebook = mock(GradebookService.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final GradeOverrideService service = new GradeOverrideService(access, entries, gradebook, audit, notifications);
    private final LmsClass clazz = clazz(null);

    @BeforeEach void setup() {
        when(access.lecturerClass(3L, 7L, false)).thenReturn(clazz);
        when(access.enrolled(3L, 42L)).thenReturn(true);
        when(entries.findByClassIdAndStudentIdAndComponent(3L, 42L, GradeComponent.FINAL)).thenReturn(Optional.empty());
    }

    @Test void manualOverrideReplacesCsvEntryAuditsAndNotifies() {
        GradeEntry csv = new GradeEntry(3L, 42L, GradeComponent.MIDTERM);
        csv.record(new BigDecimal("5.00"), GradeSource.csv, null, 7L);
        when(entries.findByClassIdAndStudentIdAndComponent(3L, 42L, GradeComponent.MIDTERM)).thenReturn(Optional.of(csv));

        service.override(3L, 42L, "midterm", new OverrideInput(new BigDecimal("8.5"), " Phúc khảo "), 7L, false);

        assertThat(csv.getScore()).isEqualByComparingTo("8.5");
        assertThat(csv.getSource()).isEqualTo(GradeSource.manual);
        assertThat(csv.getReason()).isEqualTo("Phúc khảo");
        verify(entries).save(csv);
        verify(audit).record(eq(7L), eq("grade.override"), eq("class"), eq(3L), anyMap(), anyMap());
        verify(notifications).create(eq(42L), eq("grade.updated"), anyString(), contains("Giữa kỳ"), anyMap());
        verify(gradebook).row(clazz, 42L);
    }

    @Test void newOverrideIsCreatedForComponent() {
        service.override(3L, 42L, "final", new OverrideInput(new BigDecimal("6"), "Thi lại"), 7L, false);

        ArgumentCaptor<GradeEntry> saved = ArgumentCaptor.forClass(GradeEntry.class);
        verify(entries).save(saved.capture());
        assertThat(saved.getValue().getComponent()).isEqualTo(GradeComponent.FINAL);
        assertThat(saved.getValue().getUpdatedBy()).isEqualTo(7L);
    }

    @Test void nullScoreDeletesOverride() {
        GradeEntry manual = new GradeEntry(3L, 42L, GradeComponent.FINAL);
        manual.record(new BigDecimal("6.00"), GradeSource.manual, "Thi lại", 7L);
        when(entries.findByClassIdAndStudentIdAndComponent(3L, 42L, GradeComponent.FINAL)).thenReturn(Optional.of(manual));

        service.override(3L, 42L, "final", new OverrideInput(null, null), 7L, false);

        verify(entries).delete(manual);
        verify(audit).record(eq(7L), eq("grade.override"), eq("class"), eq(3L), anyMap(), isNull());
    }

    @Test void rejectsInvalidInput() {
        assertThatThrownBy(() -> service.override(3L, 42L, "final", new OverrideInput(new BigDecimal("8"), " "), 7L, false))
                .hasMessageContaining("lý do");
        assertThatThrownBy(() -> service.override(3L, 42L, "final", new OverrideInput(new BigDecimal("8.25"), "x"), 7L, false))
                .hasMessageContaining("0,1");
        assertThatThrownBy(() -> service.override(3L, 42L, "final", new OverrideInput(new BigDecimal("10.5"), "x"), 7L, false))
                .hasMessageContaining("0 đến 10");
        assertThatThrownBy(() -> service.override(3L, 42L, "bonus", new OverrideInput(BigDecimal.ONE, "x"), 7L, false))
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatThrownBy(() -> service.override(3L, 99L, "final", new OverrideInput(BigDecimal.ONE, "x"), 7L, false))
                .extracting("code").isEqualTo("NOT_FOUND");
        verify(entries, never()).save(any());
        verifyNoInteractions(notifications);
    }
}
