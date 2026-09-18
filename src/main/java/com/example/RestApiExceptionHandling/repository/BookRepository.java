package com.example.RestApiExceptionHandling.repository;

import com.example.RestApiExceptionHandling.model.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Book} entities.
 *
 * <p>Extends {@link JpaRepository} which provides:
 * <ul>
 *   <li>Standard CRUD operations</li>
 *   <li>{@code findAll(Pageable)} for pagination and sorting</li>
 *   <li>{@code count()}, {@code existsById()}, etc.</li>
 * </ul>
 *
 * <p>Custom query methods below are implemented automatically by Spring Data
 * using the method-name derivation strategy — no SQL required.
 */
@Repository
public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Find all books whose author name contains the given string (case-insensitive),
     * with pagination and sorting support.
     *
     * @param author   the author name fragment to search for
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    Page<Book> findByAuthorContainingIgnoreCase(String author, Pageable pageable);

    /**
     * Find all books whose title contains the given string (case-insensitive),
     * with pagination and sorting support.
     *
     * @param title    the title fragment to search for
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    Page<Book> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    /**
     * Find all books in a given genre, with pagination and sorting support.
     *
     * @param genre    the genre to filter by
     * @param pageable pagination and sort parameters
     * @return a page of matching books
     */
    Page<Book> findByGenreIgnoreCase(String genre, Pageable pageable);
}