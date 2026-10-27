package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.RunDtos.*;
import vn.lmsp.dto.RunJobResult;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.RunJobKind;
import vn.lmsp.mapper.RunJobMapper;
import vn.lmsp.model.RunJob;
import vn.lmsp.repository.RunJobRepository;

class RunJobServiceTest {
    private final RunJobRepository jobs = mock(RunJobRepository.class);
    private final RunJobService service = new RunJobService(jobs, new RunJobMapper());

    static RunPayload payload() {
        return new RunPayload("python", "print(3)", 1000, 256, "token", null, 4096, false,
                List.of(new RunTest(1, "1 2", "3"), new RunTest(2, "5 5", null)));
    }
    static RunJob job(RunJobKind kind, Long requester) {
        return new RunJob(kind, requester, 100L, 81L, null, payload(), LocalDateTime.now());
    }
    private void latest(RunJob job) {
        when(jobs.findFirstByQuestionVersionIdAndKindOrderByCreatedAtDescIdDesc(81L, RunJobKind.problem_check))
                .thenReturn(Optional.ofNullable(job));
    }
    private static RunJob finished(String status, GradingVerdict verdict) {
        var job = job(RunJobKind.problem_check, 7L);
        job.finish(status, verdict, new RunJobResult(null, null, 10, List.of()), LocalDateTime.now());
        return job;
    }

    @Test void createStoresPendingOutboxJob() {
        when(jobs.save(any())).thenAnswer(call -> call.getArgument(0));
        String runId = service.create(RunJobKind.practice_run, 42L, 100L, 81L, 50L, payload());
        var saved = ArgumentCaptor.forClass(RunJob.class);
        verify(jobs).save(saved.capture());
        assertThat(saved.getValue().getJobId()).isEqualTo(runId);
        assertThat(saved.getValue().getStatus()).isEqualTo("pending");
        assertThat(saved.getValue().getPublishedAt()).isNull();
        assertThat(saved.getValue().getAssignmentId()).isEqualTo(50L);
    }

    @Test void problemCheckGateUsesLatestCheckOfVersion() {
        latest(finished("completed", GradingVerdict.AC));
        assertThat(service.status(81L)).isEqualTo(ProblemCheckGate.Status.PASSED);
        latest(finished("completed", GradingVerdict.WA));
        assertThat(service.status(81L)).isEqualTo(ProblemCheckGate.Status.FAILED);
        latest(finished("failed", GradingVerdict.SYSTEM_ERROR));
        assertThat(service.status(81L)).isEqualTo(ProblemCheckGate.Status.UNVERIFIED);
        latest(job(RunJobKind.problem_check, 7L));
        assertThat(service.status(81L)).isEqualTo(ProblemCheckGate.Status.UNVERIFIED);
        latest(null);
        assertThat(service.status(81L)).isEqualTo(ProblemCheckGate.Status.UNVERIFIED);
    }

    @Test void viewOnlyForRequesterOrAdminAndIncludesPayloadInputs() {
        var job = job(RunJobKind.draft_check, 7L);
        job.finish("completed", GradingVerdict.WA, new RunJobResult(null, null, 20, List.of(
                new RunEventTest(1, GradingVerdict.AC, 5, "3"), new RunEventTest(2, GradingVerdict.OK, 4, "10"))),
                LocalDateTime.now());
        when(jobs.findByJobId(job.getJobId())).thenReturn(Optional.of(job));

        var view = service.view(job.getJobId(), 7L, false);
        assertThat(view.tests()).extracting(RunTestView::input).containsExactly("1 2", "5 5");
        assertThat(view.tests().get(1).expected_output()).isNull();
        assertThat(view.duration_ms()).isEqualTo(20);
        assertThat(service.view(job.getJobId(), 1L, true).run_id()).isEqualTo(job.getJobId());
        assertThatThrownBy(() -> service.view(job.getJobId(), 8L, false)).isInstanceOf(LmsException.class);
    }
}
