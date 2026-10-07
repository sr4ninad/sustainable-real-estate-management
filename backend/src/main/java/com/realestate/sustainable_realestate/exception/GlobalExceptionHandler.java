package com.realestate.sustainable_realestate.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * API errors become consistent JSON: { timestamp, status, error, message, path }.
 * Admin console (HTML form) errors redirect back to the page with ?error=message.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex, HttpServletRequest req,
                                                         HttpServletResponse res) throws IOException {
        return respond(ex.getStatus(), ex.getMessage(), req, res);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex, HttpServletRequest req,
                                                            HttpServletResponse res) throws IOException {
        return respond(HttpStatus.FORBIDDEN, "You don't have permission to do that.", req, res);
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            BindException.class })
    public ResponseEntity<Map<String, Object>> handleBadInput(Exception ex, HttpServletRequest req,
                                                              HttpServletResponse res) throws IOException {
        return respond(HttpStatus.BAD_REQUEST, "The request contains missing or badly formatted values.", req, res);
    }

    /** Constraint violations and errors raised by triggers (SIGNAL SQLSTATE '45000'). */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleData(DataAccessException ex, HttpServletRequest req,
                                                          HttpServletResponse res) throws IOException {
        String detail = NestedExceptionUtils.getMostSpecificCause(ex).getMessage();
        log.warn("Database rejected {} {}: {}", req.getMethod(), req.getRequestURI(), detail);

        if (detail != null && detail.contains("Transaction blocked")) {
            return respond(HttpStatus.UNPROCESSABLE_ENTITY, detail, req, res);
        }
        if (detail != null && detail.contains("foreign key constraint")) {
            return respond(HttpStatus.CONFLICT,
                    "This record is still linked to other data (listings, transactions or features). Remove those first.",
                    req, res);
        }
        if (detail != null && detail.contains("Duplicate entry")) {
            return respond(HttpStatus.CONFLICT, "A record with this ID or name already exists.", req, res);
        }
        if (ex instanceof DataIntegrityViolationException) {
            return respond(HttpStatus.BAD_REQUEST, "The database rejected one of the values.", req, res);
        }
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "The database hit an error while processing this request.", req, res);
    }

    private static ResponseEntity<Map<String, Object>> respond(HttpStatus status, String message,
                                                               HttpServletRequest req, HttpServletResponse res)
            throws IOException {
        if (!req.getRequestURI().startsWith("/api/")) {
            res.sendRedirect(backUrl(req) + "?error=" + URLEncoder.encode(message, StandardCharsets.UTF_8));
            return null;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    /** The console page the form was posted from (same-origin path only, without its query). */
    private static String backUrl(HttpServletRequest req) {
        String referer = req.getHeader("Referer");
        if (referer == null) return "/";
        try {
            java.net.URI uri = java.net.URI.create(referer);
            String path = uri.getPath();
            return path == null || path.isEmpty() || !path.startsWith("/") || path.startsWith("//") ? "/" : path;
        } catch (IllegalArgumentException e) {
            return "/";
        }
    }
}
