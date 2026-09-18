package com.example.RestApiExceptionHandling.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Response DTO that wraps paginated data with pagination metadata.
 * Used to provide clients with page content and navigation information.
 *
 * @param <T> the type of the page content
 */
public class PagedResponse<T> {

    /** The content of the current page. */
    private List<T> content;

    /** Current page index (0-based). */
    private int currentPage;

    /** Number of records per page. */
    private int pageSize;

    /** Total number of records across all pages. */
    private long totalElements;

    /** Total number of pages. */
    private int totalPages;

    /** Whether this is the first page. */
    private boolean first;

    /** Whether this is the last page. */
    private boolean last;

    /**
     * Convenience constructor that builds a PagedResponse from a Spring {@link Page}.
     *
     * @param page the Spring Data page result
     */
    public PagedResponse(Page<T> page) {
        this.content = page.getContent();
        this.currentPage = page.getNumber();
        this.pageSize = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages = page.getTotalPages();
        this.first = page.isFirst();
        this.last = page.isLast();
    }

    public List<T> getContent() {
        return content;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public int getPageSize() {
        return pageSize;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public boolean isFirst() {
        return first;
    }

    public boolean isLast() {
        return last;
    }
}
