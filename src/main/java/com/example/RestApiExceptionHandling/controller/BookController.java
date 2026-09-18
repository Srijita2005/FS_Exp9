package com.example.RestApiExceptionHandling.controller;

import com.example.RestApiExceptionHandling.dto.ApiResponse;
import com.example.RestApiExceptionHandling.dto.BookRequest;
import com.example.RestApiExceptionHandling.dto.PagedResponse;
import com.example.RestApiExceptionHandling.model.Book;
import com.example.RestApiExceptionHandling.service.BookService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for Book CRUD operations.
 *
 * <h3>Pagination & Sorting</h3>
 * List endpoints accept standard Spring pageable query parameters:
 * <ul>
 *   <li>{@code page} — zero-based page index (default: 0)</li>
 *   <li>{@code size} — number of records per page (default: 10, max: 100)</li>
 *   <li>{@code sort} — field and direction, e.g. {@code sort=title,asc} or {@code sort=publishedYear,desc}</li>
 * </ul>
 *
 * <h3>Example Requests</h3>
 * <pre>
 * GET /api/books                              → page 0, size 10, sorted by title asc
 * GET /api/books?page=1&size=5               → second page, 5 per page
 * GET /api/books?sort=publishedYear,desc     → sorted by year descending
 * GET /api/books/search?author=Tolkien       → search by author
 * GET /api/books/search?title=ring           → search by title
 * GET /api/books/search?genre=Fantasy        → filter by genre
 * </pre>
 */
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    /**
     * Get all books with pagination and sorting.
     *
     * <p>Default: page=0, size=10, sorted by title ascending.
     * Override with query params: {@code ?page=0&size=20&sort=author,desc}
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<Book>>> getAllBooks(
            @PageableDefault(size = 10, sort = "title", direction = Sort.Direction.ASC)
            Pageable pageable) {

        Page<Book> page = bookService.getAllBooks(pageable);
        PagedResponse<Book> pagedResponse = new PagedResponse<>(page);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Books fetched successfully", pagedResponse)
        );
    }

    /**
     * Search books by author, title, or genre — all paginated and sortable.
     *
     * <p>Exactly one search parameter must be provided.
     * Uses partial, case-insensitive matching for author and title.
     *
     * @param author optional author name fragment
     * @param title  optional title fragment
     * @param genre  optional genre (exact match, case-insensitive)
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PagedResponse<Book>>> searchBooks(
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre,
            @PageableDefault(size = 10, sort = "title", direction = Sort.Direction.ASC)
            Pageable pageable) {

        Page<Book> page;

        if (author != null && !author.isBlank()) {
            page = bookService.searchByAuthor(author, pageable);
        } else if (title != null && !title.isBlank()) {
            page = bookService.searchByTitle(title, pageable);
        } else if (genre != null && !genre.isBlank()) {
            page = bookService.searchByGenre(genre, pageable);
        } else {
            // Fall back to full paginated list if no filter supplied
            page = bookService.getAllBooks(pageable);
        }

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Search completed", new PagedResponse<>(page))
        );
    }

    /**
     * Get a single book by its ID.
     * Response is served from cache if previously retrieved.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Book>> getBookById(@PathVariable Long id) {
        Book book = bookService.getBook(id);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Book fetched successfully", book)
        );
    }

    /**
     * Create a new book.
     * Invalidates the book list cache.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Book>> createBook(
            @Valid @RequestBody BookRequest request) {

        Book book = bookService.createBook(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Book created successfully", book));
    }

    /**
     * Update an existing book by ID.
     * Invalidates the cached entry for this book and the book list cache.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Book>> updateBook(
            @PathVariable Long id,
            @Valid @RequestBody BookRequest request) {

        Book book = bookService.updateBook(id, request);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Book updated successfully", book)
        );
    }

    /**
     * Delete a book by ID.
     * Evicts the book's cache entry and the book list cache.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteBook(@PathVariable Long id) {
        bookService.deleteBook(id);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Book deleted successfully",
                        "Book with ID " + id + " has been deleted")
        );
    }
}