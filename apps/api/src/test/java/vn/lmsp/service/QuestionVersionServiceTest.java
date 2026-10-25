package vn.lmsp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.QuestionMapper;
import vn.lmsp.model.QuestionProgramming;
import vn.lmsp.model.QuestionVersion;
import vn.lmsp.model.TestCase;
import vn.lmsp.repository.QuestionVersionRepository;

class QuestionVersionServiceTest {
    @Test
    void savedVersionPreservesHiddenTestsSolutionAndWeightsForGrading() {
        var question = question(100, QuestionType.programming);
        var programming = new QuestionProgramming(question, "# starter", "private-solution", List.of("python"), 1000, 128);
        var cases = List.of(new TestCase(question, "1", "2", true, BigDecimal.ONE, 1),
                new TestCase(question, "hidden-input", "hidden-output", false, BigDecimal.TEN, 2));
        var snapshot = new QuestionMapper().toSnapshot(question, List.of(), programming, cases);
        var versions = mock(QuestionVersionRepository.class);
        var reader = mock(QuestionReadService.class);
        when(reader.snapshot(question)).thenReturn(snapshot);
        when(versions.maxVersion(100L)).thenReturn(3);
        var service = new QuestionVersionService(versions, reader, new ObjectMapper());

        service.saveVersion(question, user(7, "lecturer"));

        var saved = ArgumentCaptor.forClass(QuestionVersion.class);
        verify(versions).save(saved.capture());
        assertThat(saved.getValue().getVersionNo()).isEqualTo(4);
        var restored = service.read(saved.getValue());
        assertThat(restored).usingRecursiveComparison()
                .withComparatorForType(BigDecimal::compareTo, BigDecimal.class).isEqualTo(snapshot);
        assertThat(restored.test_cases().get(1).expected_output()).isEqualTo("hidden-output");
        assertThat(restored.test_cases().get(1).weight()).isEqualByComparingTo("10");
        assertThat(restored.programming().solution_code()).isEqualTo("private-solution");
    }
}
