package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.LmsException;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

class AssignmentPublishServiceTest {
    private final AssignmentAccess access = mock(AssignmentAccess.class);
    private final AssignmentQuestionRepository links = mock(AssignmentQuestionRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final ProblemCheckGate checks = mock(ProblemCheckGate.class);
    private final AuditService audit = mock(AuditService.class);
    private final Assignment assignment = assignment(AssignmentCategory.ASSIGNMENT);
    private final Question question = question(100, QuestionType.programming);
    private final AssignmentQuestion link = link(assignment, question, "10", 1);
    private final QuestionVersion latest = version(question, 3, programmingSnapshot());
    private AssignmentPublishService service;

    @BeforeEach void setup() {
        var snapshots = new QuestionVersionService(versions, mock(QuestionReadService.class), new ObjectMapper());
        service = new AssignmentPublishService(access, links, questions, versions, mock(QuestionBankService.class), snapshots,
                new ProgrammingProblemValidator(), checks, mock(AssignmentReadService.class), audit, mock(PaperPublisher.class));
        when(access.lecturerAssignment(50L, 7L, false, true)).thenReturn(assignment);
        when(links.findAllByAssignment_IdOrderByPositionAscIdAsc(50L)).thenReturn(List.of(link));
        when(questions.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(question));
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(latest));
    }

    @Test void verifiedProblemIsPinnedAndPublished() {
        when(checks.status(1003L)).thenReturn(ProblemCheckGate.Status.PASSED);
        service.publish(50L, 7L, false, false);
        assertThat(assignment.isPublished()).isTrue();
        assertThat(link.getQuestionVersion()).isSameAs(latest);
        verify(audit, never()).record(any(), eq("assignment.publish_unverified"), any(), any(), any(), any());
    }

    @Test void failedProblemCheckBlocksPublishingEvenWithConfirmation() {
        when(checks.status(1003L)).thenReturn(ProblemCheckGate.Status.FAILED);
        assertThatThrownBy(() -> service.publish(50L, 7L, false, true)).isInstanceOfSatisfying(LmsException.class, error -> {
            assertThat(error.getCode()).isEqualTo("PROBLEM_CHECK_FAILED");
            assertThat(error.getStatus().value()).isEqualTo(409);
            assertThat(error.getDetails()).isEqualTo(Map.of("question_ids", List.of(100L)));
        });
        assertThat(assignment.isPublished()).isFalse();
        assertThat(link.getQuestionVersion()).isNull();
    }

    @Test void unverifiedProblemNeedsExplicitConfirmationWhichIsAudited() {
        when(checks.status(1003L)).thenReturn(ProblemCheckGate.Status.UNVERIFIED);
        assertThatThrownBy(() -> service.publish(50L, 7L, false, false))
                .isInstanceOfSatisfying(LmsException.class, error -> assertThat(error.getCode()).isEqualTo("PROBLEM_UNVERIFIED"));
        assertThat(assignment.isPublished()).isFalse();

        service.publish(50L, 7L, false, true);
        assertThat(assignment.isPublished()).isTrue();
        verify(audit).record(eq(7L), eq("assignment.publish_unverified"), eq("assignment"), eq(50L), isNull(),
                eq(Map.of("question_ids", List.of(100L))));
    }

    @Test void fullProblemValidationRunsBeforeTheGate() {
        var broken = programmingSnapshot();
        broken = new vn.lmsp.dto.QuestionDtos.QuestionSnapshot(broken.type(), broken.content(), null, broken.difficulty(),
                null, null, List.of(), null, broken.programming(), List.of());
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(version(question, 4, broken)));
        assertThatThrownBy(() -> service.publish(50L, 7L, false, true)).hasMessageContaining("1 đến 100 test");
        verifyNoInteractions(checks);
    }

    @Test void quizCannotContainProgrammingQuestions() {
        var quiz = assignment(AssignmentCategory.QUIZ);
        when(access.lecturerAssignment(50L, 7L, false, true)).thenReturn(quiz);
        assertThatThrownBy(() -> service.publish(50L, 7L, false, true)).hasMessageContaining("Quiz không được chứa câu lập trình");
    }
}
