package vn.lmsp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import vn.lmsp.dto.QuestionDtos.QuestionSummary;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;

/** Bốc câu hỏi ngẫu nhiên — docs/api-spec.md §5 `POST /questions/draw`, assessment-spec.md §6.2. */
public final class QuestionDrawDtos {
    private QuestionDrawDtos() { }

    public record DrawRule(@NotNull Long bank_id, Long category_id, QuestionDifficulty difficulty, QuestionType type,
                           @NotNull @Min(1) @Max(100) Integer count) { }

    public record DrawRequest(@NotNull @Size(min = 1, max = 10) List<@NotNull @Valid DrawRule> rules,
                              @Size(max = 1000) List<@NotNull Long> exclude_question_ids,
                              @Size(max = 9) List<@NotNull QuestionType> exclude_types) { }

    /** `rule` là chỉ số (bắt đầu từ 0) của quy tắc trong `rules`. */
    public record DrawShortage(int rule, int requested, int available) { }

    public record DrawResult(List<QuestionSummary> items, List<DrawShortage> shortages) { }
}
