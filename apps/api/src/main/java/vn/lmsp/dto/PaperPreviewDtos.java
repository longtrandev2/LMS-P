package vn.lmsp.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import vn.lmsp.enums.PaperMode;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;

/** Xem trước đề / mã đề — docs/api-spec.md §7 `GET /assignments/{id}/papers`, exam-spec.md §3.5. */
public final class PaperPreviewDtos {
    private PaperPreviewDtos() { }

    /** `rule_id` null = câu cố định. `content` là nội dung câu (markdown) để giảng viên đọc nhanh. */
    public record PreviewQuestion(Long question_id, QuestionType type, QuestionDifficulty difficulty, String content,
                                  BigDecimal points, Long rule_id) { }

    public record PreviewSection(String title, List<PreviewQuestion> questions) { }

    /** `code` null với `same` và đề mẫu `per_student`. */
    public record PreviewPaper(String code, BigDecimal total_points, int question_count, List<PreviewSection> sections) { }

    public record RulePool(Long rule_id, int requested, int pool_size) { }

    /**
     * `seeded` = true khi đề sinh tại chỗ từ `paper_seed` (bản nháp, hoặc đề mẫu `per_student`); false khi đọc đề đã lưu.
     * `variant_totals` theo số thứ tự mã đề ("1", "2", …), rỗng nếu không phải `variants`.
     */
    public record PapersPreview(PaperMode paper_mode, boolean seeded, List<PreviewPaper> papers, List<RulePool> rules,
                                Map<String, BigDecimal> variant_totals, List<String> warnings) { }
}
