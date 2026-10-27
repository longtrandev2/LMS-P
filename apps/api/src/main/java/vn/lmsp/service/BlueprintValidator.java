package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AssignmentDtos.AssignmentInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScorePolicy;

/**
 * Kiểm tra lịch, cách giao đề và hình dạng cấu trúc đề — docs/exam-spec.md §2, §3.2. Kỳ thi bị ép `max_attempts=1`,
 * `allow_late=false`, `score_policy=last`. Quyền ngân hàng/câu hỏi kiểm tra ở {@link BlueprintService}.
 */
@Component
public class BlueprintValidator {
    /** Giá trị hiệu lực sau khi ép theo hạng mục. */
    public record Settings(boolean allowLate, LocalDateTime lateDueAt, int penalty, Integer maxAttempts, ScorePolicy policy,
                           Integer timeLimit, PaperMode mode, Integer variantCount, String rulesText) { }

    /** Vị trí của một mục trong cấu trúc đề (câu cố định hoặc quy tắc); `type` chỉ có với quy tắc. */
    public record Placement(Integer sectionIndex, Integer variantNo, QuestionType type) { }

    public Settings settings(AssignmentInput input) {
        if (input.due_at() == null) throw bad("Hạn nộp là bắt buộc");
        if (input.available_from() != null && !input.available_from().isBefore(input.due_at()))
            throw bad("Thời điểm mở bài phải trước hạn nộp");
        AssignmentCategory category = input.category();
        boolean exam = category == AssignmentCategory.MIDTERM || category == AssignmentCategory.FINAL;
        boolean allowLate = !exam && Boolean.TRUE.equals(input.allow_late());
        if (allowLate && (input.late_due_at() == null || !input.late_due_at().isAfter(input.due_at())))
            throw bad("Hạn nộp muộn phải sau hạn nộp chính thức");
        if (input.max_attempts() != null && input.max_attempts() < 1) throw bad("Số lượt tối đa phải lớn hơn 0");
        Integer penalty = input.late_penalty_percent();
        if (penalty != null && (penalty < 0 || penalty > 100)) throw bad("Mức phạt muộn phải từ 0 đến 100%");
        PaperMode mode = input.paper_mode() == null ? PaperMode.same : input.paper_mode();
        Integer limit = input.time_limit_minutes();
        if (limit != null && (limit < 1 || limit > 600)) throw bad("Thời lượng làm bài phải từ 1 đến 600 phút");
        if (exam && limit == null) throw bad("Kỳ thi cần thời lượng làm bài (phút)");
        if (category == AssignmentCategory.ASSIGNMENT) {
            if (limit != null) throw bad("Bài tập thường không giới hạn thời gian làm bài");
            if (mode != PaperMode.same) throw bad("Bài tập thường chỉ dùng một đề chung");
        }
        Integer variants = input.variant_count();
        if (mode == PaperMode.variants && (variants == null || variants < 2 || variants > 20))
            throw bad("Đề nhiều mã cần số mã đề từ 2 đến 20");
        if (mode != PaperMode.variants && variants != null) throw bad("Chỉ đề nhiều mã mới có số mã đề");
        String rules = input.rules_text() == null || input.rules_text().isBlank() ? null : input.rules_text();
        if (rules != null && rules.length() > 10_000) throw bad("Quy chế tối đa 10 000 ký tự");
        int effectivePenalty = allowLate && penalty != null ? penalty : 0;
        if (exam) return new Settings(false, null, 0, 1, ScorePolicy.last, limit, mode, variants, rules);
        return new Settings(allowLate, allowLate ? input.late_due_at() : null, effectivePenalty, input.max_attempts(),
                input.score_policy() == null ? ScorePolicy.best : input.score_policy(), limit, mode, variants, rules);
    }

    /** Hình dạng cấu trúc đề theo hạng mục và cách giao đề (không truy cập DB). */
    public void validateBlueprint(AssignmentCategory category, PaperMode mode, Integer variantCount, int sectionCount,
                                  List<Placement> fixed, List<Placement> rules) {
        if (sectionCount > 20) throw bad("Đề có tối đa 20 phần");
        if (rules.size() > 50) throw bad("Đề có tối đa 50 quy tắc bốc ngẫu nhiên");
        if (category == AssignmentCategory.ASSIGNMENT) {
            if (!rules.isEmpty()) throw bad("Bài tập thường không dùng quy tắc bốc ngẫu nhiên");
            if (sectionCount > 1) throw bad("Bài tập thường không chia nhiều phần");
        }
        for (Placement item : fixed) placement(item, mode, variantCount, sectionCount);
        for (Placement rule : rules) {
            placement(rule, mode, variantCount, sectionCount);
            if (category == AssignmentCategory.QUIZ && rule.type() == QuestionType.programming)
                throw bad("Quiz không được chứa câu lập trình");
        }
    }

    private void placement(Placement item, PaperMode mode, Integer variantCount, int sectionCount) {
        if (item.sectionIndex() != null && (item.sectionIndex() < 0 || item.sectionIndex() >= sectionCount))
            throw bad("Phần được chọn không tồn tại trong đề");
        if (item.variantNo() == null) return;
        if (mode != PaperMode.variants) throw bad("Chỉ đề nhiều mã mới gắn câu hoặc quy tắc theo mã đề");
        if (item.variantNo() < 1 || variantCount == null || item.variantNo() > variantCount)
            throw bad("Mã đề phải từ 1 đến số mã đề");
    }

    private static LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
