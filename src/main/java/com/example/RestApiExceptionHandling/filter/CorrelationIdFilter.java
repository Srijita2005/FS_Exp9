package com.example.RestApiExceptionHandling.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Servlet filter that assigns a unique Correlation ID to every incoming HTTP request.
 *
 * <p>The Correlation ID is:
 * <ul>
 *   <li>Set into SLF4J's MDC so it appears in every log line for that request</li>
 *   <li>Returned in the {@code X-Correlation-ID} response header so clients can trace requests</li>
 * </ul>
 *
 * <p>Request duration is also logged at INFO level on completion.
 */
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CorrelationIdFilter.class);

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String correlationId = UUID.randomUUID().toString();
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        long start = System.currentTimeMillis();
        log.info("→ {} {} [correlationId={}]",
                request.getMethod(), request.getRequestURI(), correlationId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            log.info("← {} {} | {}ms [correlationId={}]",
                    response.getStatus(), request.getRequestURI(), duration, correlationId);
            MDC.clear();
        }
    }
}
