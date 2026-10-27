package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Hợp đồng đáp án và câu trả lời dùng chung cho soạn câu hỏi và chấm — docs/assessment-spec.md §1.2, §3.2. */
public final class QuestionContentDtos {
    private QuestionContentDtos() { }

    /** Đáp án của các loại không dùng `options`; chỉ trường đúng loại khác null. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AnswerSpec(
            @Size(max = 20) List<@NotBlank @Size(max = 200) String> accepted,
            Boolean case_sensitive,
            BigDecimal value,
            @DecimalMin("0") BigDecimal tolerance,
            @Size(max = 20) List<@Valid BlankSpec> blanks,
            @Size(max = 12) List<@Valid PairSpec> pairs,
            @Size(max = 6) List<@Valid ChoiceItem> distractors,
            @Size(max = 12) List<@Valid ChoiceItem> items) { }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record BlankSpec(@NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 200) String> accepted,
                            Boolean case_sensitive) { }

    /** `id`/`right_id` do server sinh (8 hex ngẫu nhiên) khi client không gửi. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PairSpec(@Pattern(regexp = "[0-9a-f]{8}") String id, @NotBlank @Size(max = 500) String left,
                           @NotBlank @Size(max = 500) String right, @Pattern(regexp = "[0-9a-f]{8}") String right_id) { }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ChoiceItem(@Pattern(regexp = "[0-9a-f]{8}") String id, @NotBlank @Size(max = 500) String text) { }

    /** Câu trả lời một câu khách quan (quiz và nộp từng câu). */
    public record AnswerInput(
            @NotNull Long question_id,
            @Size(max = 8) List<@NotNull Long> selected_option_ids,
            @Size(max = 1000) String text,
            BigDecimal number,
            @Size(max = 20) List<@NotNull @Size(max = 200) String> blanks,
            @Size(max = 12) Map<@NotBlank String, @NotBlank String> matches,
            @Size(max = 12) List<@NotBlank String> order) {
        public AnswerResponse response() {
            return new AnswerResponse(selected_option_ids, text, number, blanks, matches, order);
        }
    }

    /** Câu trả lời đã chuẩn hóa, lưu ở `submissions.response`. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AnswerResponse(List<Long> selected_option_ids, String text, BigDecimal number,
                                 List<String> blanks, Map<String, String> matches, List<String> order) { }
}
