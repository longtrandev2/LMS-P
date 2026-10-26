package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.dto.RunDtos.*;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.repository.QuestionVersionRepository;

class QuestionCheckServiceTest {
    private final QuestionService questions = mock(QuestionService.class);
    private final QuestionBankService banks = mock(QuestionBankService.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final RunJobGateway runs = mock(RunJobGateway.class);
    private final QuestionCheckService service = new QuestionCheckService(questions, banks, versions,
            new QuestionVersionService(versions, mock(QuestionReadService.class), new ObjectMapper()),
            new ProgrammingContentValidator(), runs);
    private final ArgumentCaptor<RunPayload> payload = ArgumentCaptor.forClass(RunPayload.class);

    @Test void verifyRunsSolutionOfLatestSavedVersionOnAllTests() {
        var question = question(100, QuestionType.programming);
        var version = version(question, 3, programmingSnapshot());
        when(questions.requireEditable(100L, 7L, false)).thenReturn(question);
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(version));
        when(runs.create(eq(RunJobKind.problem_check), eq(7L), eq(100L), eq(version.getId()), isNull(), payload.capture()))
                .thenReturn("run-1");

        assertThat(service.verify(100L, 7L, false).run_id()).isEqualTo("run-1");
        assertThat(payload.getValue().source_code()).isEqualTo("private-sample-solution");
        assertThat(payload.getValue().output_limit_bytes()).isEqualTo(4096);
        assertThat(payload.getValue().stop_on_failure()).isFalse();
        assertThat(payload.getValue().tests()).extracting(RunTest::expected_output).containsExactly("3", "private-output");
    }

    @Test void verifyRequiresSolutionAndLanguage() {
        var question = question(100, QuestionType.programming);
        var base = programmingSnapshot();
        var noSolution = new QuestionSnapshot(base.type(), base.content(), null, base.difficulty(), null, null, List.of(), null,
                new ProgrammingView(null, null, null, null, List.of("python"), 1000, 128, "token", null), base.test_cases());
        when(questions.requireEditable(100L, 7L, false)).thenReturn(question);
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(version(question, 1, noSolution)));

        assertThatThrownBy(() -> service.verify(100L, 7L, false)).isInstanceOf(LmsException.class)
                .hasMessageContaining("lời giải");
        verifyNoInteractions(runs);
    }

    @Test void draftCheckSendsMissingExpectedAsNullWithLargeOutputLimit() {
        when(runs.create(eq(RunJobKind.draft_check), eq(7L), isNull(), isNull(), isNull(), payload.capture())).thenReturn("run-2");
        var input = new DraftCheckInput(20L, "cpp", "int main(){}", 1000, 256, null, null,
                List.of(new DraftTest("1", "1"), new DraftTest("2", null)));

        assertThat(service.draftCheck(input, 7L, false).run_id()).isEqualTo("run-2");
        verify(banks).requireEditableBank(20L, 7L, false);
        assertThat(payload.getValue().output_limit_bytes()).isEqualTo(65536);
        assertThat(payload.getValue().checker_mode()).isEqualTo("token");
        assertThat(payload.getValue().tests().get(1).expected_output()).isNull();
        assertThat(payload.getValue().tests().get(1).position()).isEqualTo(2);
    }
}
