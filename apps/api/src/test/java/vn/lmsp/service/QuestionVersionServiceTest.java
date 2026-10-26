package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.dto.QuestionContentDtos.AnswerSpec;
import vn.lmsp.dto.QuestionDtos.ProgrammingView;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.ScoringMode;
import vn.lmsp.mapper.QuestionMapper;
import vn.lmsp.model.QuestionProgramming;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.model.TestCase;
import vn.lmsp.repository.QuestionVersionRepository;

class QuestionVersionServiceTest {
    private final QuestionVersionRepository versions = mock(QuestionVersionRepository.class);
    private final QuestionReadService reader = mock(QuestionReadService.class);
    private final QuestionVersionService service = new QuestionVersionService(versions, reader, new ObjectMapper());

    @Test
    void savedVersionPreservesHiddenTestsSolutionCheckerAndStarterCodes() {
        var question = question(100, QuestionType.programming);
        var programming = new QuestionProgramming(question, "# starter", null, null, 1000, 128);
        programming.update(Map.of("python", "import sys"), "# starter", "private-solution", "python",
                List.of("python"), 1000, 128, "float", 1e-6);
        var cases = List.of(new TestCase(question, "1", "2", true, BigDecimal.ONE, 1),
                new TestCase(question, "hidden-input", "hidden-output", false, BigDecimal.ONE, 2));
        question.updateAnswer("Giải thích", ScoringMode.all_or_nothing, null);
        var snapshot = new QuestionMapper().toSnapshot(question, List.of(), programming, cases);
        when(reader.snapshot(question)).thenReturn(snapshot);
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(version(question, 3, mcqSnapshot("cũ"))));
        when(versions.save(any())).thenAnswer(call -> call.getArgument(0));

        service.saveVersion(question, user(7, "lecturer"));

        var saved = ArgumentCaptor.forClass(QuestionVersion.class);
        verify(versions).save(saved.capture());
        assertThat(saved.getValue().getVersionNo()).isEqualTo(4);
        var restored = service.read(saved.getValue());
        assertThat(restored).usingRecursiveComparison()
                .withComparatorForType(BigDecimal::compareTo, BigDecimal.class).isEqualTo(snapshot);
        assertThat(restored.explanation()).isEqualTo("Giải thích");
        assertThat(restored.test_cases().get(1).expected_output()).isEqualTo("hidden-output");
        assertThat(restored.programming().solution_code()).isEqualTo("private-solution");
        assertThat(restored.programming().starter_codes()).containsEntry("python", "import sys");
        assertThat(restored.programming().checker_mode()).isEqualTo("float");
    }

    @Test
    void identicalSnapshotDoesNotCreateNewVersionEvenWhenNumbersDifferInScale() {
        var question = question(100, QuestionType.numeric);
        var current = new QuestionSnapshot(QuestionType.numeric, "Cổng?", null, null, null, ScoringMode.all_or_nothing,
                List.of(), new AnswerSpec(null, null, new BigDecimal("80"), BigDecimal.ZERO, null, null, null, null), null, List.of());
        var stored = new QuestionSnapshot(QuestionType.numeric, "Cổng?", null, null, null, ScoringMode.all_or_nothing,
                List.of(), new AnswerSpec(null, null, new BigDecimal("80.00"), new BigDecimal("0.0"), null, null, null, null), null, List.of());
        var latest = version(question, 2, stored);
        when(reader.snapshot(question)).thenReturn(current);
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.of(latest));

        assertThat(service.saveVersion(question, user(7, "lecturer"))).isSameAs(latest);
        verify(versions, never()).save(any());
    }

    @Test
    void firstSaveCreatesVersionOne() {
        var question = question(100, QuestionType.mcq);
        when(reader.snapshot(question)).thenReturn(mcqSnapshot("Nội dung"));
        when(versions.findTopByQuestion_IdOrderByVersionNoDesc(100L)).thenReturn(Optional.empty());
        when(versions.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(service.saveVersion(question, user(7, "lecturer")).getVersionNo()).isEqualTo(1);
    }

    @Test
    void oldSnapshotsReadWithDefaultScoringAndChecker() {
        var question = question(100, QuestionType.programming);
        var old = new QuestionSnapshot(QuestionType.programming, "Cộng", null, null, null, null, List.of(), null,
                new ProgrammingView("# starter", null, "x", null, List.of("python"), 1000, 128, null, null), List.of());

        var read = service.read(version(question, 1, old));

        assertThat(read.scoring_mode()).isEqualTo(ScoringMode.all_or_nothing);
        assertThat(read.programming().checker_mode()).isEqualTo("token");
        assertThat(read.programming().starter_code()).isEqualTo("# starter");
    }
}
