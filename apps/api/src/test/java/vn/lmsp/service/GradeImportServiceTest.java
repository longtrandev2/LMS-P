package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class GradeImportServiceTest {
    private final GradebookAccess access = mock(GradebookAccess.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final GradeEntryRepository entries = mock(GradeEntryRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final GradeImportService service = new GradeImportService(access, enrollments, users, entries, audit, notifications);
    private final LmsClass clazz = clazz(null);
    private final User first = user(42, "student"), second = user(43, "student"), third = user(44, "student");

    @BeforeEach void setup() {
        when(access.lecturerClass(3L, 7L, false)).thenReturn(clazz);
        when(enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(3L, EnrollmentStatus.active)).thenReturn(List.of(
                new Enrollment(clazz, first, EnrollmentVia.lecturer), new Enrollment(clazz, second, EnrollmentVia.lecturer),
                new Enrollment(clazz, third, EnrollmentVia.lecturer)));
        when(users.findAllById(anyIterable())).thenReturn(List.of(first, second, third));
    }

    private static ImportRow row(int number, String code, String midterm, String fin) {
        return new ImportRow(number, code, midterm == null ? null : new BigDecimal(midterm), fin == null ? null : new BigDecimal(fin));
    }

    private static ImportInput input() {
        return new ImportInput(java.util.Arrays.asList(
                row(2, "sv42", "8.5", "7"), row(3, "SV99", "5", null), row(4, "SV43", "11", null),
                row(5, "SV44", "6", null), row(6, "SV44", null, "9"), row(7, " ", "5", null),
                row(8, "SV43", null, null), row(9, "SV43", "7.125", null)));
    }

    @Test void previewReportsEachRowWithoutWriting() {
        ImportPreview preview = service.preview(3L, input(), 7L, false);

        assertThat(preview.valid_rows()).isEqualTo(1);
        assertThat(preview.rows()).extracting(ImportRowResult::row, ImportRowResult::valid, ImportRowResult::reason).containsExactly(
                org.assertj.core.groups.Tuple.tuple(2, true, null),
                org.assertj.core.groups.Tuple.tuple(3, false, "Mã sinh viên không thuộc lớp"),
                org.assertj.core.groups.Tuple.tuple(4, false, "Mã sinh viên bị trùng trong tệp"),
                org.assertj.core.groups.Tuple.tuple(5, false, "Mã sinh viên bị trùng trong tệp"),
                org.assertj.core.groups.Tuple.tuple(6, false, "Mã sinh viên bị trùng trong tệp"),
                org.assertj.core.groups.Tuple.tuple(7, false, "Thiếu mã sinh viên"),
                org.assertj.core.groups.Tuple.tuple(8, false, "Mã sinh viên bị trùng trong tệp"),
                org.assertj.core.groups.Tuple.tuple(9, false, "Mã sinh viên bị trùng trong tệp"));
        assertThat(preview.rows().getFirst().full_name()).isEqualTo(first.getFullName());
        verifyNoInteractions(entries, audit, notifications);
    }

    @Test void scoreErrorsAreReportedPerRow() {
        var rows = GradeImportValidator.validate(List.of(row(1, "SV42", "11", null), row(2, "SV43", null, "7.125"),
                row(3, "SV44", null, null)), java.util.Map.of("SV42", first, "SV43", second, "SV44", third));
        assertThat(rows).extracting(ImportRowResult::reason).containsExactly("Điểm Giữa kỳ phải từ 0 đến 10",
                "Điểm Cuối kỳ tối đa 2 chữ số thập phân", "Dòng không có điểm Giữa kỳ hoặc Cuối kỳ");
    }

    @Test void confirmWritesCsvEntriesOverwritingPreviousOnes() {
        GradeEntry manual = new GradeEntry(3L, 42L, GradeComponent.MIDTERM);
        manual.record(new BigDecimal("4.00"), GradeSource.manual, "Ghi đè", 7L);
        when(entries.findAllByClassId(3L)).thenReturn(List.of(manual));

        ImportResult result = service.confirm(3L, input(), 7L, false);

        assertThat(result.imported()).isEqualTo(1);
        assertThat(result.errors()).hasSize(7);
        assertThat(manual.getScore()).isEqualByComparingTo("8.5");
        assertThat(manual.getSource()).isEqualTo(GradeSource.csv);
        verify(entries, times(2)).save(any(GradeEntry.class));
        verify(audit).record(eq(7L), eq("grade.import"), eq("class"), eq(3L), anyMap(), anyMap());
        verify(notifications).create(eq(42L), eq("grade.updated"), anyString(), anyString(), anyMap());
        verifyNoMoreInteractions(notifications);
    }
}
