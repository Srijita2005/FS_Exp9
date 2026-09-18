package com.example.RestApiExceptionHandling.service;

import com.example.RestApiExceptionHandling.dto.BookRequest;
import com.example.RestApiExceptionHandling.exception.BookNotFoundException;
import com.example.RestApiExceptionHandling.model.Book;
import com.example.RestApiExceptionHandling.repository.BookRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service layer for Book operations.
 *
 * <h3>Caching Strategy</h3>
 * <ul>
 *   <li>{@code getBook(id)} results are cached in the "books" cache keyed by ID.
 *       Cache TTL: 10 minutes (configured in {@link com.example.RestApiExceptionHandling.config.CacheConfig}).</li>
 *   <li>Write operations (create/update/delete) evict relevant cache entries to prevent stale data.</li>
 * </ul>
 *
 * <h3>Pagination & Sorting</h3>
 * All list operations accept a {@link Pageable} parameter, which encapsulates:
 * <ul>
 *   <li>Page index ({@code page})</li>
 *   <li>Page size ({@code size})</li>
 *   <li>Sort direction and field ({@code sort})</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class BookService {

    private final BookRepository repository;

    public BookService(BookRepository repository) {
        this.repository = repository;
    }

    /**
     * Retrieve all books with pagination and sorting.
     *
     * <p>Example: {@code page=0&size=10&sort=title,asc}
     *
     * @param pageable pagination and sort parameters
     * @return a page of books
     */
    public Page<Book> getAllBooks(Pageable pageable) {
        return repository.findAll(pageable);
    }

    /**
     * Retrieve a single book by ID.
     * Result is cached in the "books" cache to avoid repeated DB hits.
     *
     * @param id the book ID
     * @return the found book
     * @throws BookNotFoundException if no book exists with the given ID
     */
    @Cacheable(value = "books", key = "#id")
    public Book getBook(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));
    }

    /**
     * Search books by author name (case-insensitive, partial match), paginated.
     *
     * @param author   the author search term
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    public Page<Book> searchByAuthor(String author, Pageable pageable) {
        return repository.findByAuthorContainingIgnoreCase(author, pageable);
    }

    /**
     * Search books by title (case-insensitive, partial match), paginated.
     *
     * @param title    the title search term
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    public Page<Book> searchByTitle(String title, Pageable pageable) {
        return repository.findByTitleContainingIgnoreCase(title, pageable);
    }

    /**
     * Search books by genre (case-insensitive, exact match), paginated.
     *
     * @param genre    the genre to filter by
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    public Page<Book> searchByGenre(String genre, Pageable pageable) {
        return repository.findByGenreIgnoreCase(genre, pageable);
    }

    /**
     * Create a new book.
     * Evicts the "bookList" cache since list results are now stale.
     *
     * @param request the book creation request
     * @return the persisted book entity
     */
    @Transactional
    @CacheEvict(value = "bookList", allEntries = true)
    public Book createBook(BookRequest request) {
        Book book = new Book();
        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setGenre(request.getGenre());
        book.setPublishedYear(request.getPublishedYear());
        return repository.save(book);
    }

    /**
     * Update an existing book.
     * Evicts the specific book from "books" cache and all "bookList" entries.
     *
     * @param id      the ID of the book to update
     * @param request the update data
     * @return the updated book entity
     * @throws BookNotFoundException if no book exists with the given ID
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "books", key = "#id"),
            @CacheEvict(value = "bookList", allEntries = true)
    })
    public Book updateBook(Long id, BookRequest request) {
        Book book = repository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));
        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setGenre(request.getGenre());
        book.setPublishedYear(request.getPublishedYear());
        return repository.save(book);
    }

    /**
     * Delete a book by ID.
     * Evicts the specific book and all "bookList" cache entries.
     *
     * @param id the ID of the book to delete
     * @throws BookNotFoundException if no book exists with the given ID
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "books", key = "#id"),
            @CacheEvict(value = "bookList", allEntries = true)
    })
    public void deleteBook(Long id) {
        Book book = repository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));
        repository.delete(book);
    }
}