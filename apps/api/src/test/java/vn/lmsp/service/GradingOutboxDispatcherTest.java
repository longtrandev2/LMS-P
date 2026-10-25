package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import vn.lmsp.enums.*;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.GradingJobRepository;

class GradingOutboxDispatcherTest {
    private GradingJob job() {
        var assignment = assignment(AssignmentCategory.ASSIGNMENT);
        var link = link(assignment, question(100, QuestionType.programming), "10", 1);
        link.pin(version(link.getQuestion(), 1, programmingSnapshot()));
        var submission = identified(Submission.programming(user(42, "student"), assignment, link, 1,
                "python", "print(3)", false, 0, "key", LocalDateTime.now()), 90);
        return new GradingJob(submission, 5, LocalDateTime.now());
    }

    @Test void marksPublishedOnlyAfterBrokerConfirmAndUsesPersistentSmallMessage() throws Exception {
        var jobs = mock(GradingJobRepository.class);
        var rabbit = mock(RabbitTemplate.class);
        var job = job();
        when(jobs.findPending(any(), any())).thenReturn(List.of(job));
        doAnswer(call -> {
            CorrelationData correlation = call.getArgument(3);
            correlation.getFuture().complete(new CorrelationData.Confirm(true, null));
            return null;
        }).when(rabbit).send(eq("lms"), eq("grading.submit"), any(Message.class), any(CorrelationData.class));

        assertThat(new GradingOutboxDispatcher(jobs, rabbit, new ObjectMapper(), new GradingMapper()).publishNext()).isTrue();

        assertThat(job.getPublishedAt()).isNotNull();
        var sent = ArgumentCaptor.forClass(Message.class);
        verify(rabbit).send(eq("lms"), eq("grading.submit"), sent.capture(), any(CorrelationData.class));
        var json = new ObjectMapper().readTree(sent.getValue().getBody());
        assertThat(json.path("job_id").asText()).isEqualTo(job.getJobId());
        assertThat(json.has("source_code")).isFalse();
        assertThat(sent.getValue().getMessageProperties().getMessageId()).isEqualTo(job.getJobId());
    }

    @Test void brokerFailureKeepsJobPendingForRetry() {
        var jobs = mock(GradingJobRepository.class);
        var rabbit = mock(RabbitTemplate.class);
        var job = job();
        when(jobs.findPending(any(), any())).thenReturn(List.of(job));
        doThrow(new AmqpException("broker unavailable")).when(rabbit)
                .send(eq("lms"), eq("grading.submit"), any(Message.class), any(CorrelationData.class));

        new GradingOutboxDispatcher(jobs, rabbit, new ObjectMapper(), new GradingMapper()).publishNext();

        assertThat(job.getPublishedAt()).isNull();
        assertThat(job.getSubmission().getStatus()).isEqualTo(SubmissionStatus.pending);
    }
}
