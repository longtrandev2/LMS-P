package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunPayload;
import vn.lmsp.dto.RunDtos.RunTest;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class PracticeRunServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final RunJobGateway runs = mock(RunJobGateway.class);
    private final Assignment assignment = assignment(AssignmentCategory.ASSIGNMENT);
    private final AssignmentQuestion link = link(assignment, question(100, QuestionType.programming), "10", 1);
    private PracticeRunService service;

    @BeforeEach void setup() {
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        var clock = Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC);
        service = new PracticeRunService(access, links, snapshots, new SubmissionPolicy(), new PracticeRateLimiter(vn.lmsp.support.TestSettings.defaults(), clock), runs,
                vn.lmsp.support.TestSettings.defaults());
        when(access.studentAssignment(50L, 42L, false)).thenReturn(assignment);
        when(links.findByAssignment_IdAndQuestion_Id(50L, 100L)).thenReturn(Optional.of(link));
        when(runs.create(any(), any(), any(), any(), any(), any())).thenReturn("run-uuid");
    }

    @Test void runsOnlyPublicTestsOfThePinnedVersion() {
        var accepted = service.run(50L, 100L, 42L, new PracticeRunInput("python", "print(3)", null));

        var payload = ArgumentCaptor.forClass(RunPayload.class);
        verify(runs).create(eq(RunJobKind.practice_run), eq(42L), eq(100L), eq(1001L), eq(50L), payload.capture());
        assertThat(accepted.run_id()).isEqualTo("run-uuid");
        assertThat(payload.getValue().tests()).containsExactly(new RunTest(1, "1 2", "3"));
        assertThat(payload.getValue().output_limit_bytes()).isEqualTo(65536);
        assertThat(payload.getValue().stop_on_failure()).isFalse();
        assertThat(payload.getValue().checker_mode()).isEqualTo("token");
        assertThat(payload.getValue().time_limit_ms()).isEqualTo(1000);
    }

    @Test void customInputRunsASingleTestWithoutExpectedOutput() {
        service.run(50L, 100L, 42L, new PracticeRunInput("python", "print(3)", "5 6"));
        verify(runs).create(any(), any(), any(), any(), any(),
                argThat(payload -> payload.tests().equals(java.util.List.of(new RunTest(1, "5 6", null)))));
    }

    @Test void languageMustBelongToThePinnedSnapshot() {
        assertThatThrownBy(() -> service.run(50L, 100L, 42L, new PracticeRunInput("java", "class Main {}", null)))
                .hasMessageContaining("Ngôn ngữ");
        verifyNoInteractions(runs);
    }

    @Test void seventhRunWithinAMinuteIsRateLimited() {
        var input = new PracticeRunInput("python", "print(3)", null);
        for (int i = 0; i < 6; i++) service.run(50L, 100L, 42L, input);
        assertThatThrownBy(() -> service.run(50L, 100L, 42L, input)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("RATE_LIMITED");
            assertThat(error.getStatus().value()).isEqualTo(429);
        });
        verify(runs, times(6)).create(any(), any(), any(), any(), any(), any());
    }

    @Test void closedAssignmentCannotBeRun() {
        assignment.update("Bài", null, AssignmentCategory.ASSIGNMENT, null, vn.lmsp.common.UtcTime.now().minusHours(1),
                false, null, 0, 3, ScorePolicy.best);
        assertThatThrownBy(() -> service.run(50L, 100L, 42L, new PracticeRunInput("python", "print(3)", null)))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("DEADLINE_PASSED"));
    }
}
