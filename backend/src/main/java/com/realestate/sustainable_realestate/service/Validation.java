package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;

import java.util.regex.Pattern;

/** Input checks shared by the people services (column sizes match database/schema.sql). */
final class Validation {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE = Pattern.compile("^[+\\d][\\d\\s-]{6,14}$");

    private Validation() {}

    static String name(String value) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("Name is required.");
        }
        String v = value.trim();
        if (v.length() > 100) {
            throw ApiException.badRequest("Name can be at most 100 characters.");
        }
        return v;
    }

    static String email(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim();
        if (v.length() > 100 || !EMAIL.matcher(v).matches()) {
            throw ApiException.badRequest("Enter a valid email address.");
        }
        return v;
    }

    static String phone(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim();
        if (!PHONE.matcher(v).matches()) {
            throw ApiException.badRequest("Enter a valid phone number (7–15 digits).");
        }
        return v;
    }

    static void positiveId(int id, String label) {
        if (id <= 0) {
            throw ApiException.badRequest(label + " must be a positive number.");
        }
    }
}
