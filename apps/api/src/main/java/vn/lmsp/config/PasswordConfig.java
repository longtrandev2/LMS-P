package vn.lmsp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PasswordConfig {
    @Bean PasswordEncoder passwordEncoder() { return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(); }
}

