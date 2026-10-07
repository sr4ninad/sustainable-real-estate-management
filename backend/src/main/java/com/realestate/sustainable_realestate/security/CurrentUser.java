package com.realestate.sustainable_realestate.security;

import com.realestate.sustainable_realestate.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Access to the signed-in user plus the ownership rules shared by the services. */
@Component
public class CurrentUser {

    /** The signed-in user, or null when the call isn't authenticated (e.g. startup code). */
    public AuthUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        return null;
    }

    public AuthUser require() {
        AuthUser user = get();
        if (user == null) {
            throw ApiException.forbidden("You need to sign in first.");
        }
        return user;
    }

    public boolean isAdmin() {
        AuthUser user = get();
        return user != null && user.isAdmin();
    }

    /** Admins may act on any listing; agents only on listings assigned to them. */
    public void requireListingAccess(Integer listingAgentId) {
        AuthUser user = require();
        if (user.isAdmin()) return;
        if (user.isAgent() && user.getAgentId() != null && user.getAgentId().equals(listingAgentId)) return;
        throw ApiException.forbidden("You can only manage your own listings.");
    }

    public void requireAdminOrAgent() {
        AuthUser user = require();
        if (!user.isAdmin() && !user.isAgent()) {
            throw ApiException.forbidden("Only agents and admins can do that.");
        }
    }

    public void requireAdmin() {
        if (!require().isAdmin()) {
            throw ApiException.forbidden("Only admins can do that.");
        }
    }
}
