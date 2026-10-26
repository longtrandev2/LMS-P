package vn.lmsp.worker;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Khai báo lại các queue worker tiêu thụ, cùng tham số với API — docs/message-contracts.md §1. */
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

    @Bean FanoutExchange runsDeadExchange() { return new FanoutExchange("lms.runs.dlx", true, false); }
    @Bean Queue runsQueue() { return QueueBuilder.durable("q.runs").deadLetterExchange("lms.runs.dlx").build(); }
    @Bean Queue runsDeadQueue() { return QueueBuilder.durable("q.runs.dead").build(); }
    @Bean Binding runsBinding() { return BindingBuilder.bind(runsQueue()).to(lmsExchange()).with("run.submit"); }
    @Bean Binding runsDeadBinding() { return BindingBuilder.bind(runsDeadQueue()).to(runsDeadExchange()); }
}
