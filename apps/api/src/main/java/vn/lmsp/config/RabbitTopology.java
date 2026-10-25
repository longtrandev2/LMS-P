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
}
