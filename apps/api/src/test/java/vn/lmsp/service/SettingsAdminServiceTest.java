package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.service.SettingDefinitions.*;
import static vn.lmsp.support.DomainFixtures.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.SettingView;
import vn.lmsp.dto.AdminDtos.SettingsUpdate;
import vn.lmsp.model.SystemSetting;
import vn.lmsp.repository.SystemSettingRepository;
import vn.lmsp.repository.UserRepository;

class SettingsAdminServiceTest {
    private final ObjectMapper json = new ObjectMapper();
    private final List<SystemSetting> rows = new ArrayList<>();
    private final SystemSettingRepository repository = mock(SystemSettingRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final SystemSettingsService settings = new SystemSettingsService(repository, json, 20);
    private final RealtimePublisher realtime = mock(RealtimePublisher.class);
    private final SettingsAdminService service = new SettingsAdminService(settings, repository, users, audit, json, realtime);

    @BeforeEach void setup() {
        when(repository.findAll()).thenAnswer(call -> List.copyOf(rows));
        when(repository.save(any())).thenAnswer(call -> { rows.add(call.getArgument(0)); return call.getArgument(0); });
        when(users.getReferenceById(1L)).thenReturn(user(1, "admin"));
    }

    @Test void emptyTableListsEveryKeyWithDefaultsAndVietnameseDescriptions() {
        var items = service.view().items();
        assertThat(items).extracting(SettingView::key).containsExactly(ALLOWED_LANGUAGES, DEFAULT_TIME, DEFAULT_MEMORY,
                MAX_TIME, MAX_MEMORY, PRACTICE_RUNS, MAX_UPLOAD, LEAVE_EVIDENCE, GRADE_POLICY, MAINTENANCE, INACTIVITY_TIMEOUT);
        assertThat(items).allSatisfy(item -> {
            assertThat(item.value()).isEqualTo(item.default_value());
            assertThat(item.description()).isNotBlank();
            assertThat(item.updated_by()).isNull();
        });
        assertThat(settings.allowedLanguages()).containsExactly("python", "c", "cpp", "java");
        assertThat(List.of(settings.defaultTimeLimitMs(), settings.defaultMemoryLimitMb(), settings.maxTimeLimitMs(),
                settings.maxMemoryLimitMb(), settings.practiceRunsPerMinute(), settings.maxUploadMb(), settings.leaveEvidenceMaxMb()))
                .containsExactly(1000, 256, 10000, 1024, 6, 20, 5);
        assertThat(settings.defaultGradePolicy()).isEqualTo(GradePolicyCodec.DEFAULT);
        assertThat(settings.maintenance().enabled()).isFalse();
    }

    @Test void invalidStoredValuesFallBackToDefaultsAndDefaultAboveMaxIsClamped() {
        store(MAX_TIME, "\"abc\"");
        store(PRACTICE_RUNS, "500");
        store(MAX_MEMORY, "512");
        store(DEFAULT_MEMORY, "1024");
        assertThat(settings.maxTimeLimitMs()).isEqualTo(10000);
        assertThat(settings.practiceRunsPerMinute()).isEqualTo(6);
        assertThat(settings.defaultMemoryLimitMb()).isEqualTo(512);
    }

    @Test void updateUpsertsChangedKeysAuditsAndRefreshesCache() {
        store(MAX_TIME, "8000");
        assertThat(settings.maxTimeLimitMs()).isEqualTo(8000); // nạp cache
        var result = service.update(new SettingsUpdate(Map.of(MAX_TIME, num(5000), DEFAULT_TIME, num(2000),
                PRACTICE_RUNS, num(6)), "  Giảm tải máy chấm "), 1L);

        assertThat(settings.maxTimeLimitMs()).isEqualTo(5000);
        assertThat(settings.defaultTimeLimitMs()).isEqualTo(2000);
        verify(repository, times(1)).save(any()); // default_time mới; max_time cập nhật dòng cũ; practice không đổi
        SettingView maxTime = result.items().stream().filter(item -> item.key().equals(MAX_TIME)).findFirst().orElseThrow();
        assertThat(maxTime.value().intValue()).isEqualTo(5000);
        assertThat(maxTime.updated_by().id()).isEqualTo(1L);

        @SuppressWarnings("unchecked") ArgumentCaptor<Map<String, Object>> before = ArgumentCaptor.forClass(Map.class);
        @SuppressWarnings("unchecked") ArgumentCaptor<Map<String, Object>> after = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(1L), eq("settings.update"), eq("system_settings"), eq(0L), before.capture(), after.capture());
        assertThat(before.getValue()).containsOnlyKeys(MAX_TIME, DEFAULT_TIME);
        assertThat(after.getValue()).containsOnlyKeys(MAX_TIME, DEFAULT_TIME, "reason").containsEntry("reason", "Giảm tải máy chấm");
        verify(realtime).toAll(eq("settings.changed"), argThat(data ->
                new HashSet<>((Collection<?>) data.get("keys")).equals(Set.of(MAX_TIME, DEFAULT_TIME))));
    }

    @Test void oneInvalidKeyRejectsTheWholeUpdate() {
        assertThatThrownBy(() -> service.update(new SettingsUpdate(Map.of(MAX_TIME, num(5000), PRACTICE_RUNS, num(0),
                "khoa_la", num(1)), null), 1L)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(error.getStatus().value()).isEqualTo(400);
            assertThat((Map<String, String>) error.getDetails()).containsOnlyKeys(PRACTICE_RUNS, "khoa_la");
        });
        verify(repository, never()).save(any());
        verifyNoInteractions(audit, realtime);
        assertThat(settings.maxTimeLimitMs()).isEqualTo(10000);
    }

    @Test void crossKeyConstraintIsCheckedOnTheMergedValues() {
        store(MAX_TIME, "2000");
        assertDetails(Map.of(DEFAULT_TIME, num(3000)), DEFAULT_TIME, "2000 ms");
        assertDetails(Map.of(MAX_MEMORY, num(128)), MAX_MEMORY, "128 MB");
        assertDetails(Map.of(MAX_UPLOAD, num(21)), MAX_UPLOAD, "1 đến 20");
        assertDetails(Map.of(LEAVE_EVIDENCE, num(0)), LEAVE_EVIDENCE, "1 đến 20");
        assertDetails(Map.of(ALLOWED_LANGUAGES, json.valueToTree(List.of())), ALLOWED_LANGUAGES, "ít nhất một");
        assertDetails(Map.of(ALLOWED_LANGUAGES, json.valueToTree(List.of("rust"))), ALLOWED_LANGUAGES, "rust");
        assertDetails(Map.of(MAINTENANCE, json.valueToTree(Map.of("enabled", true, "message", "x".repeat(501)))),
                MAINTENANCE, "500");
        assertDetails(Map.of(GRADE_POLICY, json.valueToTree(Map.of("weights", Map.of("attendance", 10, "assignment", 20,
                "midterm", 20, "final", 40), "attendance", Map.of("absent_penalty", 2, "late_penalty", 0.5,
                "excused_penalty", 0)))), GRADE_POLICY, "100%");
        service.update(new SettingsUpdate(Map.of(DEFAULT_TIME, num(1500), MAX_TIME, num(1500)), null), 1L);
        assertThat(settings.maxTimeLimitMs()).isEqualTo(1500);
    }

    @Test void valuesAreNormalizedAndExposedThroughPublicSettings() {
        Map<String, JsonNode> values = new LinkedHashMap<>();
        values.put(ALLOWED_LANGUAGES, json.valueToTree(List.of("java", "python", "java")));
        values.put(MAINTENANCE, json.valueToTree(Map.of("enabled", true, "message", "  ")));
        values.put(GRADE_POLICY, json.valueToTree(Map.of("weights", Map.of("attendance", 0, "assignment", 30,
                "midterm", 20, "final", 50), "attendance", Map.of("max_absences", 3, "absent_penalty", 1.5,
                "late_penalty", 0.25, "excused_penalty", 0))));
        service.update(new SettingsUpdate(values, null), 1L);

        var view = settings.publicSettings();
        assertThat(view.allowed_languages()).containsExactly("python", "java");
        assertThat(view.maintenance().enabled()).isTrue();
        assertThat(view.maintenance().message()).isEqualTo(DEFAULT_MAINTENANCE_MESSAGE);
        assertThat(view.max_upload_mb()).isEqualTo(20);
        assertThat(settings.defaultGradePolicy().weights().assignment()).isEqualTo(30);
        assertThat(GradePolicyCodec.read(null, settings.defaultGradePolicy()).attendance().max_absences()).isEqualTo(3);
    }

    @Test void uploadLimitsNeverExceedTheServerCap() throws Exception {
        store(MAX_UPLOAD, "20");
        store(LEAVE_EVIDENCE, "12");
        var capped = new SystemSettingsService(repository, json, 10);
        assertThat(capped.maxUploadMb()).isEqualTo(10);
        assertThat(capped.leaveEvidenceMaxMb()).isEqualTo(5);
        var view = new SettingsAdminService(capped, repository, users, audit, json, mock(RealtimePublisher.class)).view().items();
        assertThat(view.stream().filter(item -> item.key().equals(MAX_UPLOAD)).findFirst().orElseThrow()
                .default_value().intValue()).isEqualTo(10);
    }

    private void assertDetails(Map<String, JsonNode> values, String key, String message) {
        assertThatThrownBy(() -> service.update(new SettingsUpdate(values, null), 1L))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat((Map<String, String>) error.getDetails())
                        .containsOnlyKeys(key).extractingByKey(key).asString().contains(message));
    }

    private void store(String key, String value) { rows.add(new SystemSetting(key, value, null, UtcTime.now())); }
    private JsonNode num(int value) { return json.valueToTree(value); }
}
