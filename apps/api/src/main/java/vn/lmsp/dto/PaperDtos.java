package vn.lmsp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionContentDtos.ChoiceItem;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;

/** "Đề cho sinh viên" và bản đầy đủ cho giảng viên — docs/api-spec.md §6, docs/assessment-spec.md §6.1. */
public final class PaperDtos {
    private PaperDtos() { }

    /** `is_correct` chỉ có trong bản của giảng viên. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AssignmentOptionView(Long id, String content, Boolean is_correct) { }

    public record MatchingView(List<ChoiceItem> lefts, List<ChoiceItem> rights) { }

    public record SampleView(int position, String input, String expected_output) { }

    public record ProgrammingPaper(List<String> allowed_languages, int time_limit_ms, int memory_limit_mb,
                                   String checker_mode, Map<String, String> starter_codes, List<SampleView> samples) { }

    /**
     * Một câu trong đề. Trường theo loại vắng khi không áp dụng. Bản sinh viên không bao giờ có
     * `explanation`, `scoring_mode`, `answer_spec`, `test_cases` (gồm test ẩn) hay `is_correct`.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AssignmentQuestionView(Long question_id, Long question_version_id, QuestionType type, String content,
            BigDecimal points, int position, List<AssignmentOptionView> options, Integer blank_count,
            MatchingView matching, List<ChoiceItem> ordering_items, ProgrammingPaper programming,
            String topic, QuestionDifficulty difficulty, String explanation, ScoringMode scoring_mode,
            AnswerSpec answer_spec, List<TestCaseView> test_cases) { }
}
