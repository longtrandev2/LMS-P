package vn.lmsp.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitTopology {
    @Bean DirectExchange lmsExchange() { return new DirectExchange("lms", true, false); }
    @Bean FanoutExchange deadLetterExchange() { return new FanoutExchange("lms.dlx", true, false); }
    @Bean Queue gradingQueue() {
        return QueueBuilder.durable("q.grading").maxPriority(10).deadLetterExchange("lms.dlx").build();
    }
    @Bean Queue gradingDeadQueue() { return QueueBuilder.durable("q.grading.dead").build(); }
    @Bean Binding gradingBinding() { return BindingBuilder.bind(gradingQueue()).to(lmsExchange()).with("grading.submit"); }
    @Bean Binding gradingDeadBinding() { return BindingBuilder.bind(gradingDeadQueue()).to(deadLetterExchange()); }
    @Bean FanoutExchange eventsDeadExchange() { return new FanoutExchange("lms.events.dlx", true, false); }
    @Bean Queue gradingEventsQueue() {
        return QueueBuilder.durable("q.grading.events").deadLetterExchange("lms.events.dlx").build();
    }
    @Bean Queue eventsDeadQueue() { return QueueBuilder.durable("q.grading.events.dead").build(); }
    @Bean Binding eventsBinding() { return BindingBuilder.bind(gradingEventsQueue()).to(lmsExchange()).with("grading.events"); }
    @Bean Binding eventsDeadBinding() { return BindingBuilder.bind(eventsDeadQueue()).to(eventsDeadExchange()); }

    // Run jobs (message-contracts.md §1): mỗi queue chính có DLX fanout riêng. Worker khai báo lại q.runs cùng tham số.
    @Bean FanoutExchange runsDeadExchange() { return new FanoutExchange("lms.runs.dlx", true, false); }
    @Bean Queue runsQueue() { return QueueBuilder.durable("q.runs").deadLetterExchange("lms.runs.dlx").build(); }
    @Bean Queue runsDeadQueue() { return QueueBuilder.durable("q.runs.dead").build(); }
    @Bean Binding runsBinding() { return BindingBuilder.bind(runsQueue()).to(lmsExchange()).with("run.submit"); }
    @Bean Binding runsDeadBinding() { return BindingBuilder.bind(runsDeadQueue()).to(runsDeadExchange()); }
    @Bean FanoutExchange runEventsDeadExchange() { return new FanoutExchange("lms.run-events.dlx", true, false); }
    @Bean Queue runEventsQueue() { return QueueBuilder.durable("q.run.events").deadLetterExchange("lms.run-events.dlx").build(); }
    @Bean Queue runEventsDeadQueue() { return QueueBuilder.durable("q.run.events.dead").build(); }
    @Bean Binding runEventsBinding() { return BindingBuilder.bind(runEventsQueue()).to(lmsExchange()).with("run.events"); }
    @Bean Binding runEventsDeadBinding() { return BindingBuilder.bind(runEventsDeadQueue()).to(runEventsDeadExchange()); }
}
