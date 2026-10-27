package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.service.SettingDefinitions.*;
import static vn.lmsp.support.DomainFixtures.clazz;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.ProgrammingInput;
import vn.lmsp.mapper.MaterialMapper;
import vn.lmsp.repository.*;
import vn.lmsp.support.TestSettings;

/** Các nơi đọc cấu hình hệ thống thay cho hằng số ghi cứng — docs/admin-spec.md §1. */
class SettingsConsumersTest {
    @TempDir Path root;

    private static ProgrammingInput program(List<String> languages, Integer time, Integer memory) {
        return new ProgrammingInput(null, null, null, null, languages, time, memory, null, null);
    }

    @Test void programmingAuthoringUsesAllowedLanguagesLimitsAndDefaults() {
        var settings = TestSettings.with(Map.of(ALLOWED_LANGUAGES, List.of("python", "cpp"), DEFAULT_TIME, 2000,
                DEFAULT_MEMORY, 128, MAX_TIME, 15000, MAX_MEMORY, 512));
        var validator = new ProgrammingContentValidator(settings);

        var result = validator.validate(program(List.of("cpp", "python"), null, null));
        assertThat(result.allowed_languages()).containsExactly("python", "cpp");
        assertThat(result.time_limit_ms()).isEqualTo(2000);
        assertThat(result.memory_limit_mb()).isEqualTo(128);
        assertThat(validator.validate(program(List.of("python"), 15000, 512)).time_limit_ms()).isEqualTo(15000);

        assertThatThrownBy(() -> validator.validate(program(List.of("python", "java"), null, null)))
                .isInstanceOf(LmsException.class).hasMessageContaining("java hiện không được phép");
        assertThatThrownBy(() -> validator.validate(program(List.of("python"), 15001, null)))
                .hasMessageContaining("100 đến 15000 ms");
        assertThatThrownBy(() -> validator.validate(program(List.of("python"), null, 1024)))
                .hasMessageContaining("32 đến 512 MB");
    }

    @Test void practiceRateLimitFollowsTheSetting() {
        var clock = Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC);
        var limiter = new PracticeRateLimiter(TestSettings.with(Map.of(PRACTICE_RUNS, 2)), clock);
        limiter.acquire(42L);
        limiter.acquire(42L);
        assertThatThrownBy(() -> limiter.acquire(42L)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("RATE_LIMITED");
            assertThat(error.getMessage()).contains("tối đa 2 lần");
        });
    }

    @Test void leaveEvidenceSizeUsesTheSetting() {
        var storage = new LeaveEvidenceStorage(root.toString(), TestSettings.with(Map.of(LEAVE_EVIDENCE, 1)));
        byte[] big = new byte[1024 * 1024 + 1];
        big[0] = '%'; big[1] = 'P'; big[2] = 'D'; big[3] = 'F';
        assertThatThrownBy(() -> storage.store(3L, new MockMultipartFile("evidence", "a.pdf", "application/pdf", big)))
                .hasMessageContaining("tối đa 1 MB");
    }

    @Test void materialUploadSizeUsesTheSetting() {
        var classes = mock(ClassRepository.class);
        when(classes.findById(3L)).thenReturn(Optional.of(clazz(null)));
        var settings = TestSettings.with(Map.of(MAX_UPLOAD, 1));
        var service = new MaterialService(mock(MaterialRepository.class), classes, mock(EnrollmentRepository.class),
                mock(UserRepository.class), mock(NotificationService.class), mock(AuditService.class), new MaterialMapper(),
                mock(ClassSessionRepository.class), settings, settings, root.toString());
        var file = new MockMultipartFile("file", "slide.pdf", "application/pdf", new byte[1024 * 1024 + 1]);
        assertThatThrownBy(() -> service.upload(3L, 7L, "Slide", null, file, null)).hasMessageContaining("giới hạn 1MB");
    }
}
