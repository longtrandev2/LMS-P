package vn.lmsp.support;

import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import vn.lmsp.repository.SystemSettingRepository;
import vn.lmsp.service.SettingDefinitions;
import vn.lmsp.service.SystemSettingsService;

/** Cấu hình hệ thống thật (bảng trống → mặc định) cho unit test; ghi đè từng khóa bằng {@link #with}. */
public final class TestSettings {
    private static final ObjectMapper JSON = new ObjectMapper();

    private TestSettings() { }

    public static SystemSettingsService defaults() {
        SystemSettingRepository repository = mock(SystemSettingRepository.class);
        when(repository.findAll()).thenReturn(List.of());
        return new SystemSettingsService(repository, JSON, 20);
    }

    /** Giá trị ghi đè phải đã ở dạng chuẩn (như sau khi PUT). */
    public static SystemSettingsService with(Map<String, Object> overrides) {
        SystemSettingsService settings = defaults();
        var values = new LinkedHashMap<>(settings.effective(List.of()).values());
        overrides.forEach((key, value) -> values.put(key, JSON.valueToTree(value)));
        settings.refresh(values);
        return settings;
    }

    public static SystemSettingsService maintenance(String message) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("enabled", true);
        value.put("message", message);
        return with(Map.of(SettingDefinitions.MAINTENANCE, value));
    }
}
