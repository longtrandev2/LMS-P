package vn.lmsp.worker;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Chạy job với số lần thử lại giới hạn khi Docker lỗi, trong thời gian job tổng.
 * Không bao giờ ném lỗi: lỗi hạ tầng trả về {@link ExecutionResult#failure}.
 */
@Service
@Slf4j
public class ExecutionService {
    static final int MAX_ATTEMPTS = 3;
    private final CodeExecutor executor;

    public ExecutionService(CodeExecutor executor) { this.executor = executor; }

    public ExecutionResult run(ExecutionRequest request, String label) {
        var deadline = JobDeadline.start(request);
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return executor.execute(request, deadline);
            } catch (JobDeadline.JobTimeoutException error) {
                log.warn("{} exceeded its {} ms budget", label, deadline.budgetMs());
                return ExecutionResult.failure("Quá thời gian chấm tổng của job.", deadline.elapsedMs());
            } catch (SandboxException error) {
                log.warn("Sandbox attempt {}/{} failed for {}: {}", attempt, MAX_ATTEMPTS, label, error.getMessage());
                if (attempt < MAX_ATTEMPTS && !pause(attempt * 500L)) break;
            } catch (RuntimeException error) {
                log.error("Unexpected execution error for {}", label, error);
                return ExecutionResult.failure("Lỗi hệ thống khi chấm bài.", deadline.elapsedMs());
            }
        }
        return ExecutionResult.failure("Sandbox chấm bài lỗi sau nhiều lần thử.", deadline.elapsedMs());
    }

    private boolean pause(long millis) {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
