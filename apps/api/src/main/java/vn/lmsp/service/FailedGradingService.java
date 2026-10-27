package vn.lmsp.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.AmqpException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.repository.FailedGradingQueries;

/** Job chấm lỗi và hàng chết — docs/admin-spec.md §4. */
@Service
@RequiredArgsConstructor
public class FailedGradingService {
    public static final int MAX_BULK = 500;
    private final FailedGradingQueries queries;
    private final RegradeService regrade;
    private final QueueInspector queues;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public FailedPage failed(int page, int limit) {
        if (page < 1 || limit < 1 || limit > 100) throw invalid("page hoặc limit không hợp lệ");
        return new FailedPage(queries.page(limit, (page - 1) * limit), queries.count(), page, limit);
    }

    /** Đúng một trong hai: `submission_ids` (≤ 500) hoặc `all_failed = true` (500 bài cũ nhất còn `failed`). */
    public BulkRegradeResult regrade(BulkRegradeInput input, Long actorId) {
        boolean all = Boolean.TRUE.equals(input.all_failed());
        List<Long> ids = input.submission_ids() == null ? List.of()
                : List.copyOf(new LinkedHashSet<>(input.submission_ids()));
        if (all == !ids.isEmpty())
            throw invalid("Chọn danh sách bài nộp hoặc chấm lại toàn bộ bài lỗi (chỉ một trong hai)");
        if (ids.size() > MAX_BULK) throw invalid("Tối đa " + MAX_BULK + " bài nộp mỗi lần chấm lại");
        if (input.reason() == null || input.reason().isBlank()) throw invalid("Cần nhập lý do chấm lại");
        return regrade.regradeFailed(all ? queries.failedIds(MAX_BULK) : ids, actorId, input.reason());
    }

    public PurgeResult purge(String name, String reason, Long actorId) {
        if (!QueueInspector.isDeadQueue(name)) throw invalid("Chỉ được dọn các hàng chết (.dead)");
        long purged;
        try {
            purged = queues.purge(name);
        } catch (AmqpException unavailable) {
            throw new LmsException("INTERNAL", "Không kết nối được hàng đợi; vui lòng thử lại sau",
                    HttpStatus.SERVICE_UNAVAILABLE, null);
        }
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("queue", name);
        value.put("purged", purged);
        value.put("reason", reason.strip());
        audit.record(actorId, "queue.purge", "queue", 0L, null, value);
        return new PurgeResult(purged);
    }

    private static LmsException invalid(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
