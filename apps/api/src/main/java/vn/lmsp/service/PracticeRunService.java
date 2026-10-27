package vn.lmsp.service;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.TestCaseView;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.dto.RunDtos.RunPayload;
import vn.lmsp.dto.RunDtos.RunTest;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.repository.AssignmentQuestionRepository;

/**
 * Chạy thử của sinh viên (`practice_run`) — docs/assessment-spec.md §7. Không tạo submission, không tính lượt/điểm.
 * Chạy test công khai của phiên bản đã ghim, hoặc một input tự nhập.
 */
@Service
@RequiredArgsConstructor
public class PracticeRunService {
    static final int OUTPUT_LIMIT_BYTES = 65536;
    private final AssignmentAccess access;
    private final AssignmentQuestionRepository links;
    private final QuestionVersionService snapshots;
    private final SubmissionPolicy policy;
    private final PracticeRateLimiter limiter;
    private final RunJobGateway runs;

    @Transactional
    public RunAccepted run(Long assignmentId, Long questionId, Long studentId, PracticeRunInput input) {
        var assignment = access.studentAssignment(assignmentId, studentId, false);
        policy.window(assignment, UtcTime.now());
        var link = links.findByAssignment_IdAndQuestion_Id(assignmentId, questionId)
                .orElseThrow(() -> bad("Câu hỏi không thuộc bài này"));
        if (link.getQuestionVersion() == null) throw bad("Câu hỏi chưa được ghim phiên bản");
        var snapshot = snapshots.read(link.getQuestionVersion());
        ProgrammingView programming = snapshot.programming();
        if (snapshot.type() != QuestionType.programming || programming == null)
            throw bad("Chỉ có thể chạy thử câu hỏi lập trình");
        if (programming.allowed_languages() == null || !programming.allowed_languages().contains(input.language()))
            throw bad("Ngôn ngữ không được phép trong phiên bản đề này");
        List<RunTest> tests = input.custom_input() != null ? List.of(new RunTest(1, input.custom_input(), null))
                : publicTests(snapshot.test_cases());
        if (tests.isEmpty()) throw bad("Đề không có test công khai; hãy nhập input để chạy thử");
        limiter.acquire(studentId);
        String checker = programming.checker_mode() == null ? "token" : programming.checker_mode();
        var payload = new RunPayload(input.language(), input.source_code(), programming.time_limit_ms(),
                programming.memory_limit_mb(), checker, programming.checker_epsilon(), OUTPUT_LIMIT_BYTES, false, tests);
        String runId = runs.create(RunJobKind.practice_run, studentId, questionId, link.getQuestionVersion().getId(),
                assignmentId, payload);
        return new RunAccepted(runId);
    }

    private List<RunTest> publicTests(List<TestCaseView> cases) {
        if (cases == null) return List.of();
        return cases.stream().filter(TestCaseView::is_public).sorted(Comparator.comparingInt(TestCaseView::position))
                .map(test -> new RunTest(test.position(), test.input(), test.expected_output())).toList();
    }

    private LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }
}
