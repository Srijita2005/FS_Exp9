package com.example.RestApiExceptionHandling.exception;

/**
 * Thrown when a Book with a given ID is not found in the database.
 */
public class BookNotFoundException extends RuntimeException {

    public BookNotFoundException(Long id) {
        super("Book not found with id: " + id);
    }
}