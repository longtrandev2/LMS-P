package vn.lmsp.service;

import java.util.List;
import vn.lmsp.dto.GradebookDtos.GradePolicy;

/**
 * Cấu hình hệ thống đã gộp mặc định — docs/admin-spec.md §1. Đọc từ cache trong bộ nhớ, rẻ, gọi được ở mọi nơi.
 * Khóa thiếu hoặc hỏng trong DB trả mặc định.
 */
public interface SettingsProvider {
    List<String> allowedLanguages();
    int defaultTimeLimitMs();
    int defaultMemoryLimitMb();
    int maxTimeLimitMs();
    int maxMemoryLimitMb();
    int practiceRunsPerMinute();
    /** Đã kẹp theo trần server `MAX_UPLOAD_MB`. */
    int maxUploadMb();
    /** Đã kẹp theo trần server `MAX_UPLOAD_MB`. */
    int leaveEvidenceMaxMb();
    GradePolicy defaultGradePolicy();
    Maintenance maintenance();
    int inactivityTimeoutMinutes();

    record Maintenance(boolean enabled, String message) {
        public static final Maintenance OFF = new Maintenance(false, null);
    }
}
