package com.example.RestApiExceptionHandling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class RestApiExceptionHandlingApplication {

    public static void main(String[] args) {
        SpringApplication.run(RestApiExceptionHandlingApplication.class, args);
    }
}