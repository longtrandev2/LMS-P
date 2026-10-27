package vn.lmsp.service;

import static vn.lmsp.service.SettingDefinitions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.MaintenanceView;
import vn.lmsp.dto.AdminDtos.PublicSettings;
import vn.lmsp.dto.GradebookDtos.GradePolicy;
import vn.lmsp.model.SystemSetting;
import vn.lmsp.repository.SystemSettingRepository;

/**
 * Cấu hình hệ thống đã gộp mặc định, giữ trong bộ nhớ — docs/admin-spec.md §1, §5.2. Nạp lười lần đầu đọc, làm mới
 * sau mỗi lần PUT thành công (sau commit). Một instance API là đủ cho đồ án.
 */
@Service
public class SystemSettingsService implements SettingsProvider, MaintenanceGuard {
    private static final Logger log = LoggerFactory.getLogger(SystemSettingsService.class);

    /** Giá trị đã chuẩn hóa theo khóa và bản đọc nhanh. */
    record Values(Map<String, JsonNode> raw, List<String> languages, int defaultTime, int defaultMemory, int maxTime,
                  int maxMemory, int practiceRuns, int maxUpload, int leaveEvidence, GradePolicy gradePolicy,
                  Maintenance maintenance) {
        static Values of(Map<String, JsonNode> raw) {
            List<String> languages = new ArrayList<>();
            raw.get(ALLOWED_LANGUAGES).forEach(item -> languages.add(item.textValue()));
            JsonNode maintenance = raw.get(MAINTENANCE);
            String message = maintenance.path("message").isTextual() ? maintenance.path("message").textValue() : null;
            return new Values(Map.copyOf(raw), List.copyOf(languages), raw.get(DEFAULT_TIME).intValue(),
                    raw.get(DEFAULT_MEMORY).intValue(), raw.get(MAX_TIME).intValue(), raw.get(MAX_MEMORY).intValue(),
                    raw.get(PRACTICE_RUNS).intValue(), raw.get(MAX_UPLOAD).intValue(), raw.get(LEAVE_EVIDENCE).intValue(),
                    GradePolicyCodec.read(raw.get(GRADE_POLICY)),
                    new Maintenance(maintenance.path("enabled").booleanValue(), message));
        }
    }

    /** Giá trị hiệu lực theo khóa + các khóa có giá trị lưu bị hỏng. */
    public record Effective(Map<String, JsonNode> values, Set<String> invalidStored) { }

    private final SystemSettingRepository repository;
    private final ObjectMapper json;
    private final int uploadCapMb;
    private final SettingDefinitions definitions;
    private volatile Values cache;

    public SystemSettingsService(SystemSettingRepository repository, ObjectMapper json,
                                 @Value("${lms.upload.max-mb:20}") int uploadCapMb) {
        this.repository = repository; this.json = json; this.uploadCapMb = uploadCapMb;
        this.definitions = new SettingDefinitions(json, uploadCapMb);
    }

    public SettingDefinitions definitions() { return definitions; }

    /** Gộp giá trị lưu với mặc định; giá trị hỏng hoặc vi phạm ràng buộc chéo → mặc định (ghi cảnh báo). */
    public Effective effective(Collection<SystemSetting> rows) {
        Map<String, JsonNode> values = new LinkedHashMap<>();
        Set<String> invalid = new HashSet<>();
        Map<String, SystemSetting> byKey = new HashMap<>();
        rows.forEach(row -> byKey.put(row.getKey(), row));
        for (var definition : definitions.all()) {
            SystemSetting row = byKey.get(definition.key());
            JsonNode value = definition.defaultValue();
            if (row != null) {
                try { value = definition.normalize().apply(json.readTree(row.getValue())); }
                catch (Exception error) {
                    log.warn("Cấu hình {} lưu trong DB không hợp lệ, dùng mặc định: {}", definition.key(), error.getMessage());
                    invalid.add(definition.key());
                }
            }
            values.put(definition.key(), value);
        }
        for (String key : definitions.crossCheck(values, Set.of(), Set.of()).keySet()) {
            String maxKey = DEFAULT_TIME.equals(key) ? MAX_TIME : MAX_MEMORY;
            log.warn("Cấu hình {} lưu trong DB vượt {}, dùng giá trị trần", key, maxKey);
            values.put(key, values.get(maxKey));
            invalid.add(key);
        }
        return new Effective(values, invalid);
    }

    /** Thay cache bằng giá trị mới — sau commit nếu đang trong giao dịch. */
    public void refresh(Map<String, JsonNode> values) {
        Values next = Values.of(values);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { replace(next); }
            });
        } else replace(next);
    }

    private synchronized void replace(Values next) { cache = next; }

    private Values values() {
        Values current = cache;
        if (current != null) return current;
        synchronized (this) {
            if (cache == null) cache = Values.of(effective(repository.findAll()).values());
            return cache;
        }
    }

    @Override public List<String> allowedLanguages() { return values().languages(); }
    @Override public int defaultTimeLimitMs() { return values().defaultTime(); }
    @Override public int defaultMemoryLimitMb() { return values().defaultMemory(); }
    @Override public int maxTimeLimitMs() { return values().maxTime(); }
    @Override public int maxMemoryLimitMb() { return values().maxMemory(); }
    @Override public int practiceRunsPerMinute() { return values().practiceRuns(); }
    @Override public int maxUploadMb() { return Math.min(values().maxUpload(), uploadCapMb); }
    @Override public int leaveEvidenceMaxMb() { return Math.min(values().leaveEvidence(), uploadCapMb); }
    @Override public GradePolicy defaultGradePolicy() { return values().gradePolicy(); }
    @Override public Maintenance maintenance() { return values().maintenance(); }

    @Override
    public void check(boolean admin) {
        Maintenance maintenance = maintenance();
        if (admin || !maintenance.enabled()) return;
        throw new LmsException("MAINTENANCE", message(maintenance), HttpStatus.SERVICE_UNAVAILABLE, null);
    }

    public PublicSettings publicSettings() {
        Values v = values();
        Maintenance m = v.maintenance();
        return new PublicSettings(v.languages(), v.defaultTime(), v.defaultMemory(), v.maxTime(), v.maxMemory(),
                maxUploadMb(), leaveEvidenceMaxMb(), new MaintenanceView(m.enabled(), m.enabled() ? message(m) : m.message()));
    }

    private static String message(Maintenance maintenance) {
        return maintenance.message() == null || maintenance.message().isBlank() ? DEFAULT_MAINTENANCE_MESSAGE : maintenance.message();
    }
}
