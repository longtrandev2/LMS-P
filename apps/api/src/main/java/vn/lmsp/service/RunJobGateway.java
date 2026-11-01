package vn.lmsp.service;

import vn.lmsp.dto.RunDtos.RunPayload;
import vn.lmsp.enums.RunJobKind;

/**
 * Tạo run job (outbox `run_jobs`) — docs/assessment-spec.md §7.
 * Hiện thực: RunJobService. Bên gọi tự kiểm tra quyền, giới hạn tần suất và dựng payload.
 * @return run_id (UUID)
 */
public interface RunJobGateway {
    String create(RunJobKind kind, Long requestedBy, Long questionId, Long questionVersionId,
                  Long assignmentId, RunPayload payload);
}
