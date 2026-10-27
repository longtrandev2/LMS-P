package vn.lmsp.service;

/**
 * Chặn thao tác "bắt đầu việc mới" khi bảo trì — docs/admin-spec.md §5.2. Ném 503 `MAINTENANCE` kèm thông điệp bảo trì.
 * Admin không bị chặn.
 */
public interface MaintenanceGuard {
    void check(boolean admin);
}
