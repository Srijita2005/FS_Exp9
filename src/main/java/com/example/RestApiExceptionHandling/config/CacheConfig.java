package com.example.RestApiExceptionHandling.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache configuration using Caffeine as the cache provider.
 *
 * <p>Two named caches are configured:
 * <ul>
 *   <li><b>books</b> — caches individual Book entities by ID (TTL: 10 minutes, max 500 entries)</li>
 *   <li><b>bookList</b> — caches paginated book list results (TTL: 5 minutes, max 50 entries)</li>
 * </ul>
 *
 * <p>Cache eviction is triggered on any create, update, or delete operation via
 * {@code @CacheEvict} annotations in {@link com.example.RestApiExceptionHandling.service.BookService}.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * CacheManager bean backed by Caffeine.
     * Registers named caches with independent TTL and size settings.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // Cache for individual book lookups: evict after 10 minutes of write, max 500 entries
        manager.registerCustomCache("books",
                Caffeine.newBuilder()
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .maximumSize(500)
                        .recordStats()
                        .build());

        // Cache for list/page results: shorter TTL since lists change more often
        manager.registerCustomCache("bookList",
                Caffeine.newBuilder()
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .maximumSize(50)
                        .recordStats()
                        .build());

        return manager;
    }
}
