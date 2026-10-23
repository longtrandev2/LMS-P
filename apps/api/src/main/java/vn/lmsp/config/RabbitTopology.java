package vn.lmsp.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitTopology {
    @Bean DirectExchange lmsExchange() { return new DirectExchange("lms", true, false); }
    @Bean Queue eventQueue() { return QueueBuilder.durable("q.events").build(); }
    @Bean Binding eventBinding() { return BindingBuilder.bind(eventQueue()).to(lmsExchange()).with("events.ws"); }
}
