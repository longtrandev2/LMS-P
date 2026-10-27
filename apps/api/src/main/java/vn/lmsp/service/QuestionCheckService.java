package vn.lmsp.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.dto.RunDtos.*;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.model.Question;
import vn.lmsp.repository.QuestionVersionRepository;

/** Kiểm tra đề (`problem_check`) và chạy code trên test chưa lưu (`draft_check`) — assessment-spec.md §7. */
@Service
@RequiredArgsConstructor
public class QuestionCheckService {
    static final int PROBLEM_CHECK_OUTPUT = 4096, DRAFT_CHECK_OUTPUT = 65536;
    private final QuestionService questions;
    private final QuestionBankService banks;
    private final QuestionVersionRepository versions;
    private final QuestionVersionService snapshots;
    private final ProgrammingContentValidator programs;
    private final RunJobGateway runs;

    /** Chạy lời giải mẫu của phiên bản mới nhất đã lưu trên mọi test, không dừng sớm. */
    @Transactional
    public RunAccepted verify(Long questionId, Long actorId, boolean admin) {
        Question question = questions.requireEditable(questionId, actorId, admin);
        if (question.getType() != QuestionType.programming) throw bad("Chỉ kiểm tra đề cho câu hỏi lập trình", HttpStatus.BAD_REQUEST);
        var version = versions.findTopByQuestion_IdOrderByVersionNoDesc(questionId)
                .orElseThrow(() -> bad("Câu hỏi chưa có phiên bản đã lưu", HttpStatus.CONFLICT));
        var snapshot = snapshots.read(version);
        var program = snapshot.programming();
        if (program == null || program.solution_code() == null || program.solution_code().isBlank() || program.solution_language() == null)
            throw bad("Cần lưu lời giải mẫu và ngôn ngữ lời giải trước khi kiểm tra đề", HttpStatus.CONFLICT);
        if (snapshot.test_cases() == null || snapshot.test_cases().isEmpty())
            throw bad("Câu hỏi chưa có test để kiểm tra", HttpStatus.CONFLICT);
        List<RunTest> tests = snapshot.test_cases().stream().sorted(Comparator.comparingInt(TestCaseView::position))
                .map(test -> new RunTest(test.position(), test.input(), test.expected_output())).toList();
        var payload = new RunPayload(program.solution_language(), program.solution_code(), program.time_limit_ms(),
                program.memory_limit_mb(), program.checker_mode(), program.checker_epsilon(), PROBLEM_CHECK_OUTPUT, false, tests);
        return new RunAccepted(runs.create(RunJobKind.problem_check, actorId, questionId, version.getId(), null, payload));
    }

    /** Chạy code trên test của form chưa lưu; test thiếu expected chỉ lấy output (verdict `OK`). */
    @Transactional
    public RunAccepted draftCheck(DraftCheckInput input, Long actorId, boolean admin) {
        banks.requireEditableBank(input.bank_id(), actorId, admin);
        String checker = input.checker_mode() == null || input.checker_mode().isBlank() ? "token" : input.checker_mode();
        Double epsilon = "float".equals(checker)
                ? (input.checker_epsilon() == null ? ProgrammingContentValidator.DEFAULT_EPSILON : input.checker_epsilon()) : null;
        List<String> sizes = new ArrayList<>();
        List<RunTest> tests = new ArrayList<>();
        for (int i = 0; i < input.tests().size(); i++) {
            DraftTest test = input.tests().get(i);
            if (test == null) throw bad("Test " + (i + 1) + " không hợp lệ", HttpStatus.BAD_REQUEST);
            sizes.add(test.input()); sizes.add(test.expected_output());
            tests.add(new RunTest(i + 1, test.input(), test.expected_output()));
        }
        programs.requireTotalSize(sizes);
        var payload = new RunPayload(input.language(), input.source_code(), input.time_limit_ms(), input.memory_limit_mb(),
                checker, epsilon, DRAFT_CHECK_OUTPUT, false, tests);
        return new RunAccepted(runs.create(RunJobKind.draft_check, actorId, null, null, null, payload));
    }

    private static LmsException bad(String message, HttpStatus status) {
        return new LmsException("VALIDATION_ERROR", message, status, null);
    }
}
