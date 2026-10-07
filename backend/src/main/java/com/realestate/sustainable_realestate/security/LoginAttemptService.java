package com.realestate.sustainable_realestate.security;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Slows down password guessing: 5 failed attempts lock a username for 2 minutes. */
@Service
public class LoginAttemptService {

    static final int MAX_ATTEMPTS = 5;
    static final Duration LOCK_TIME = Duration.ofMinutes(2);

    private record Attempts(int count, Instant lockedUntil) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    public boolean isLocked(String username) {
        Attempts a = attempts.get(key(username));
        return a != null && a.lockedUntil() != null && Instant.now().isBefore(a.lockedUntil());
    }

    public void recordFailure(String username) {
        attempts.compute(key(username), (k, a) -> {
            int count = (a == null || (a.lockedUntil() != null && Instant.now().isAfter(a.lockedUntil())))
                    ? 1 : a.count() + 1;
            return new Attempts(count, count >= MAX_ATTEMPTS ? Instant.now().plus(LOCK_TIME) : null);
        });
    }

    public void recordSuccess(String username) {
        attempts.remove(key(username));
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }
}
