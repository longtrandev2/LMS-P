package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.dto.AssignmentDtos.QuestionSubmissionInput;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class ProgrammingSubmissionServiceTest {
    private static final String KEY = "12345678-1234-1234-1234-123456789abc";
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final SubmissionRepository submissions = mock(SubmissionRepository.class);
    private final GradingJobRepository jobs = mock(GradingJobRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Assignment assignment = assignment(AssignmentCategory.ASSIGNMENT);
    private final AssignmentQuestion link = link(assignment, question(100, QuestionType.programming), "10", 1);
    private final QuestionSubmissionInput input = new QuestionSubmissionInput(null, "python", "print(3)");
    private ProgrammingSubmissionService service;

    @BeforeEach void setup() {
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        service = new ProgrammingSubmissionService(access, links, submissions, jobs, users, snapshots,
                new SubmissionPolicy(), new ProgrammingProblemValidator(), new GradingMapper(), mock(AuditService.class));
        when(access.studentAssignment(50L, 42L, true)).thenReturn(assignment);
        when(links.findByAssignment_IdAndQuestion_Id(50L, 100L)).thenReturn(Optional.of(link));
        when(users.findById(42L)).thenReturn(Optional.of(user(42, "student")));
        when(submissions.saveAndFlush(any())).thenAnswer(call -> identified(call.getArgument(0), 90));
    }

    @Test void acceptsPendingSubmissionAndTransactionalOutboxWithPinnedVersion() {
        var receipt = service.submit(50L, 100L, 42L, KEY, input);
        var job = ArgumentCaptor.forClass(GradingJob.class);
        verify(jobs).save(job.capture());
        assertThat(receipt.accepted().submission_id()).isEqualTo(90L);
        assertThat(receipt.accepted().status()).isEqualTo(SubmissionStatus.pending);
        var submission = job.getValue().getSubmission();
        assertThat(submission.getScore()).isNull();
        assertThat(submission.getQuestionVersion().getId()).isEqualTo(1001L);
        assertThat(submission.getSourceCode()).isEqualTo("print(3)");
        assertThat(submission.getMaxScore()).isEqualByComparingTo("10");
        assertThat(job.getValue().getPriority()).isEqualTo(5);
    }

    @Test void duplicateKeyDoesNotCreateAnotherSubmissionOrJob() {
        var existing = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, KEY, LocalDateTime.now()), 90);
        when(submissions.findByIdempotencyKey(KEY)).thenReturn(Optional.of(existing));
        assertThat(service.submit(50L, 100L, 42L, KEY, input).replayed()).isTrue();
        verify(submissions, never()).saveAndFlush(any());
        verifyNoInteractions(jobs);
        assertThatThrownBy(() -> service.submit(50L, 100L, 42L, KEY,
                new QuestionSubmissionInput(null, "python", "print(4)"))).hasMessageContaining("nội dung khác");
    }

    @Test void rejectsLanguageNotAllowedByPinnedSnapshot() {
        assertThatThrownBy(() -> service.submit(50L, 100L, 42L, KEY,
                new QuestionSubmissionInput(null, "java", "class Main {}"))).hasMessageContaining("Ngôn ngữ");
        verifyNoInteractions(jobs);
    }

    @Test void rejectsCodeBeyondUtf8ByteLimitAndMixedMcqPayload() {
        assertThatThrownBy(() -> service.submit(50L, 100L, 42L, KEY,
                new QuestionSubmissionInput(null, "python", "🙂".repeat(40000)))).hasMessageContaining("128KiB");
        assertThatThrownBy(() -> service.submit(50L, 100L, 42L, KEY,
                new QuestionSubmissionInput(java.util.List.of(11L), "python", "print(3)"))).hasMessageContaining("MCQ");
        verify(submissions, never()).saveAndFlush(any());
    }

    @Test void enforcesAttemptLimitBeforePersisting() {
        when(submissions.countByAssignment_IdAndStudent_IdAndQuestion_Id(50L, 42L, 100L)).thenReturn(3L);
        assertThatThrownBy(() -> service.submit(50L, 100L, 42L, KEY, input)).hasMessageContaining("hết số lượt");
        verifyNoInteractions(jobs);
    }
}
