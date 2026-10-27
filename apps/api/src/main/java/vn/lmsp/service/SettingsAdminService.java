package vn.lmsp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.model.SystemSetting;
import vn.lmsp.model.User;
import vn.lmsp.repository.SystemSettingRepository;
import vn.lmsp.repository.UserRepository;

/** `GET/PUT /admin/settings` — docs/admin-spec.md §1. PUT kiểm tra toàn bộ rồi mới ghi (tất cả hoặc không). */
@Service
@RequiredArgsConstructor
public class SettingsAdminService {
    static final String AUDIT_ACTION = "settings.update", AUDIT_ENTITY = "system_settings";
    private final SystemSettingsService settings;
    private final SystemSettingRepository repository;
    private final UserRepository users;
    private final AuditService audit;
    private final ObjectMapper json;

    @Transactional(readOnly = true)
    public SettingsView view() {
        List<SystemSetting> rows = repository.findAll();
        Map<String, SystemSetting> byKey = byKey(rows);
        Map<String, JsonNode> values = settings.effective(rows).values();
        List<SettingView> items = new ArrayList<>();
        for (var definition : settings.definitions().all()) {
            SystemSetting row = byKey.get(definition.key());
            User by = row == null ? null : row.getUpdatedBy();
            items.add(new SettingView(definition.key(), values.get(definition.key()), definition.defaultValue(),
                    definition.description(), by == null ? null : new UserRef(by.getId(), by.getFullName()),
                    row == null ? null : row.getUpdatedAt()));
        }
        return new SettingsView(items);
    }

    @Transactional
    public SettingsView update(SettingsUpdate input, Long actorId) {
        List<SystemSetting> rows = repository.findAll();
        SystemSettingsService.Effective current = settings.effective(rows);
        Map<String, String> errors = new LinkedHashMap<>();
        Map<String, JsonNode> next = new LinkedHashMap<>();
        input.values().forEach((key, value) -> {
            var definition = settings.definitions().get(key);
            if (definition == null) { errors.put(key, "Khóa cấu hình không tồn tại"); return; }
            try { next.put(key, definition.normalize().apply(value)); }
            catch (IllegalArgumentException error) { errors.put(key, error.getMessage()); }
        });
        Map<String, JsonNode> merged = new LinkedHashMap<>(current.values());
        merged.putAll(next);
        errors.putAll(settings.definitions().crossCheck(merged, next.keySet(), errors.keySet()));
        if (!errors.isEmpty())
            throw new LmsException("VALIDATION_ERROR", errors.values().iterator().next(), HttpStatus.BAD_REQUEST, errors);

        Map<String, Object> before = new LinkedHashMap<>(), after = new LinkedHashMap<>();
        Map<String, SystemSetting> byKey = byKey(rows);
        User actor = users.getReferenceById(actorId);
        var now = UtcTime.now();
        for (var entry : next.entrySet()) {
            String key = entry.getKey();
            boolean stale = current.invalidStored().contains(key);
            if (entry.getValue().equals(current.values().get(key)) && !stale) continue;
            before.put(key, current.values().get(key));
            after.put(key, entry.getValue());
            SystemSetting row = byKey.get(key);
            if (row == null) repository.save(new SystemSetting(key, write(entry.getValue()), actor, now));
            else row.update(write(entry.getValue()), actor, now);
        }
        if (!after.isEmpty()) {
            String reason = input.reason() == null || input.reason().isBlank() ? null : input.reason().strip();
            if (reason != null) after.put("reason", reason);
            audit.record(actorId, AUDIT_ACTION, AUDIT_ENTITY, 0L, before, after);
            repository.flush();
            settings.refresh(merged);
        }
        return view();
    }

    private String write(JsonNode value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalStateException(error); }
    }

    private static Map<String, SystemSetting> byKey(Collection<SystemSetting> rows) {
        Map<String, SystemSetting> result = new HashMap<>();
        rows.forEach(row -> result.put(row.getKey(), row));
        return result;
    }
}
