package com.realestate.sustainable_realestate.security;

public enum Role {
    /** Full access to everything, including user management and the admin console. */
    ADMIN,
    /** Manages their own listings and deals; can onboard clients. */
    AGENT,
    /** Browses properties; sees only their own profile and transactions. */
    CLIENT
}
