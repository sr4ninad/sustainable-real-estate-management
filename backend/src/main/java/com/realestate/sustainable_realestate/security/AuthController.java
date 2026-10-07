package com.realestate.sustainable_realestate.security;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.ClientRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) {}

    public record PasswordChange(String currentPassword, String newPassword) {}

    public record Me(Integer userId, String username, Role role, Integer agentId, Integer clientId,
                     String displayName, String clientType) {}

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final AppUserRepository users;
    private final AgentRepository agents;
    private final ClientRepository clients;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService attempts;
    private final CurrentUser currentUser;

    public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
                          AppUserRepository users, AgentRepository agents, ClientRepository clients,
                          PasswordEncoder passwordEncoder, LoginAttemptService attempts, CurrentUser currentUser) {
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
        this.users = users;
        this.agents = agents;
        this.clients = clients;
        this.passwordEncoder = passwordEncoder;
        this.attempts = attempts;
        this.currentUser = currentUser;
    }

    @PostMapping("/login")
    public Me login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        String username = body == null || body.username() == null ? "" : body.username().trim();
        String password = body == null || body.password() == null ? "" : body.password();
        if (username.isEmpty() || password.isEmpty()) {
            throw ApiException.badRequest("Enter your username and password.");
        }
        if (attempts.isLocked(username)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Try again in a couple of minutes.");
        }

        Authentication auth;
        try {
            auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (DisabledException e) {
            throw ApiException.forbidden("This account has been disabled. Contact an admin.");
        } catch (AuthenticationException e) {
            attempts.recordFailure(username);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password.");
        }
        attempts.recordSuccess(username);

        // New session id on login (prevents session fixation), then store the authentication in it.
        HttpSession existing = request.getSession(false);
        if (existing != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);

        AuthUser principal = (AuthUser) auth.getPrincipal();
        users.findById(principal.getUserId()).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            users.save(u);
        });
        return describe(principal);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @GetMapping("/me")
    public Me me() {
        return describe(currentUser.require());
    }

    @PostMapping("/password")
    public void changePassword(@RequestBody PasswordChange body) {
        AuthUser principal = currentUser.require();
        AppUser user = users.findById(principal.getUserId())
                .orElseThrow(() -> ApiException.notFound("Account not found."));
        if (body == null || body.currentPassword() == null
                || !passwordEncoder.matches(body.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Your current password is incorrect.");
        }
        UserController.validatePassword(body.newPassword());
        user.setPasswordHash(passwordEncoder.encode(body.newPassword()));
        users.save(user);
    }

    private Me describe(AuthUser user) {
        String displayName = user.getUsername();
        String clientType = null;
        if (user.getAgentId() != null) {
            displayName = agents.findById(user.getAgentId()).map(a -> a.getName()).orElse(displayName);
        }
        if (user.getClientId() != null) {
            var client = clients.findById(user.getClientId()).orElse(null);
            if (client != null) {
                displayName = client.getName();
                clientType = client.getType() == null ? null : client.getType().toLowerCase();
            }
        }
        if (user.isAdmin()) {
            displayName = "Administrator";
        }
        return new Me(user.getUserId(), user.getUsername(), user.getRole(), user.getAgentId(), user.getClientId(),
                displayName, clientType);
    }
}
