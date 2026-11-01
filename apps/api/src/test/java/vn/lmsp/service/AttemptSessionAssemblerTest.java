package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.SessionFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.QuestionVersionRepository;
import vn.lmsp.repository.SessionAnswerRepository;

/** Dựng `AttemptSessionView` và chạy thử trong phiên. */
class AttemptSessionAssemblerTest {
    private final PaperProvider papers = mock(PaperProvider.class);
    private final SessionPaper paper = new SessionPaper(papers);
    private final SessionAnswerRepository answers = mock(SessionAnswerRepository.class);
    private final Assignment assignment = sessionAssignment(AssignmentCategory.MIDTERM, 60, 24 * 60);
    private final AssignmentQuestion choice = mcq(assignment, 100);
    private final AssignmentQuestion program = code(assignment, 101);
    private AttemptSessionAssembler assembler;
    private AttemptSession session;

    @BeforeEach void setup() {
        var snapshots = new QuestionVersionService(mock(QuestionVersionRepository.class), mock(QuestionReadService.class), new ObjectMapper());
        assembler = new AttemptSessionAssembler(paper, answers, snapshots, new QuestionPaperMapper(), mock(QuizAttemptService.class));
        session = session(assignment, paper(assignment, "101"), List.of(program, choice), UtcTime.now().plusMinutes(30));
        when(papers.paperQuestions(70L)).thenReturn(List.of(choice, program));
        when(papers.sections(50L)).thenReturn(List.of());
        var saved = new SessionAnswer(session, choice);
        saved.saveAnswer(new AnswerResponse(List.of(12L), null, null, null, null, null), UtcTime.now());
        when(answers.findAllBySession_Id(900L)).thenReturn(List.of(saved));
    }

    @Test void inProgressViewFollowsQuestionOrderWithStudentPaperAndSavedAnswers() {
        var view = assembler.view(session, UtcTime.now());

        assertThat(view.session().paper_code()).isEqualTo("101");
        assertThat(view.session().attempt()).isNull();
        assertThat(view.total_points()).isEqualByComparingTo("10");
        assertThat(view.sections()).singleElement().satisfies(section -> {
            assertThat(section.title()).isEmpty();
            assertThat(section.questions()).extracting(q -> q.question_id()).containsExactly(101L, 100L);
            assertThat(section.questions()).extracting(q -> q.position()).containsExactly(1, 2);
            assertThat(section.questions()).allSatisfy(q -> {
                assertThat(q.answer_spec()).isNull();
                assertThat(q.explanation()).isNull();
                assertThat(q.test_cases()).isNull();
            });
            assertThat(section.questions().get(0).programming().samples()).hasSize(1);
            assertThat(section.questions().get(1).options()).allSatisfy(option -> assertThat(option.is_correct()).isNull());
        });
        assertThat(view.answers()).singleElement().satisfies(answer -> {
            assertThat(answer.question_id()).isEqualTo(100L);
            assertThat(answer.response().selected_option_ids()).containsExactly(12L);
        });
    }

    @Test void submittedViewHasNoPaper() {
        session.markSubmitted(SubmitReason.manual, UtcTime.now(), null);
        var view = assembler.view(session, UtcTime.now());
        assertThat(view.sections()).isEmpty();
        assertThat(view.answers()).isEmpty();
        assertThat(view.session().remaining_seconds()).isZero();
        verifyNoInteractions(answers);
    }

    @Test void practiceRunRequiresOpenSessionAndQuestionOfThePaper() {
        var access = mock(SessionAccess.class);
        var practice = mock(PracticeRunService.class);
        var runs = new SessionPracticeRunService(access, paper, practice);
        var input = new PracticeRunInput("python", "print(3)", null);
        when(access.ownSession(900L, 42L, false)).thenReturn(session);
        when(practice.runPinned(program, 42L, input)).thenReturn(new RunAccepted("run-1"));

        assertThat(runs.run(900L, 101L, 42L, input).run_id()).isEqualTo("run-1");
        assertThatThrownBy(() -> runs.run(900L, 999L, 42L, input)).extracting("code").isEqualTo("VALIDATION_ERROR");
        session.markSubmitted(SubmitReason.manual, UtcTime.now(), null);
        assertThatThrownBy(() -> runs.run(900L, 101L, 42L, input)).extracting("code").isEqualTo("SESSION_ENDED");
        verify(practice, times(1)).runPinned(any(), any(), any());
    }
}
