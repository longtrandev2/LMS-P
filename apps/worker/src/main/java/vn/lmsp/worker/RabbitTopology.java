package vn.lmsp.worker;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitTopology {
    @Bean DirectExchange lmsExchange() { return new DirectExchange("lms", true, false); }
    @Bean FanoutExchange deadExchange() { return new FanoutExchange("lms.dlx", true, false); }
    @Bean Queue gradingQueue() {
        return QueueBuilder.durable("q.grading").maxPriority(10).deadLetterExchange("lms.dlx").build();
    }
    @Bean Queue gradingDeadQueue() { return QueueBuilder.durable("q.grading.dead").build(); }
    @Bean Binding gradingBinding() {
        return BindingBuilder.bind(gradingQueue()).to(lmsExchange()).with("grading.submit");
    }
    @Bean Binding deadBinding() { return BindingBuilder.bind(gradingDeadQueue()).to(deadExchange()); }
}
