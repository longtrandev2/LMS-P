package vn.lmsp.service;

import java.util.List;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionDtos.OptionInput;
import vn.lmsp.dto.QuestionDtos.ProgrammingInput;
import vn.lmsp.dto.QuestionDtos.TestCaseInput;
import vn.lmsp.enums.ScoringMode;

/**
 * Nội dung câu hỏi đã kiểm tra và chuẩn hóa theo loại (assessment-spec.md §1–4), sẵn sàng lưu.
 * Trường không thuộc loại câu luôn rỗng: `options` chỉ cho câu lựa chọn, `answerSpec` cho loại dùng answer_spec,
 * `programming`/`testCases` cho câu lập trình.
 */
public record QuestionContent(String content, String explanation, ScoringMode scoringMode, List<OptionInput> options,
                              AnswerSpec answerSpec, ProgrammingInput programming, List<TestCaseInput> testCases) { }
