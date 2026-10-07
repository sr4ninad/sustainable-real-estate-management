package com.realestate.sustainable_realestate.security;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.ClientRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

/** Admin-only management of login accounts. */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9._-]{3,40}$");

    public record UserView(Integer userId, String username, Role role, Integer agentId, Integer clientId,
                           String linkedName, boolean enabled, LocalDateTime createdAt, LocalDateTime lastLogin) {}

    public record CreateUser(String username, String password, Role role, Integer agentId, Integer clientId) {}

    public record UpdateUser(Boolean enabled, String password) {}

    private final AppUserRepository users;
    private final AgentRepository agents;
    private final ClientRepository clients;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;

    public UserController(AppUserRepository users, AgentRepository agents, ClientRepository clients,
                          PasswordEncoder passwordEncoder, CurrentUser currentUser) {
        this.users = users;
        this.agents = agents;
        this.clients = clients;
        this.passwordEncoder = passwordEncoder;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(this::view).toList();
    }

    @PostMapping
    @Transactional
    public UserView create(@RequestBody CreateUser body) {
        if (body == null || body.role() == null) {
            throw ApiException.badRequest("Choose a role.");
        }
        String username = body.username() == null ? "" : body.username().trim();
        if (!USERNAME.matcher(username).matches()) {
            throw ApiException.badRequest("Usernames are 3–40 characters: letters, numbers, dots, dashes or underscores.");
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            throw ApiException.conflict("The username \"" + username + "\" is already taken.");
        }
        validatePassword(body.password());

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(body.password()));
        user.setRole(body.role());

        switch (body.role()) {
            case AGENT -> {
                if (body.agentId() == null || !agents.existsById(body.agentId())) {
                    throw ApiException.badRequest("Choose the agent this login belongs to.");
                }
                if (users.existsByAgentId(body.agentId())) {
                    throw ApiException.conflict("That agent already has a login.");
                }
                user.setAgentId(body.agentId());
            }
            case CLIENT -> {
                if (body.clientId() == null || !clients.existsById(body.clientId())) {
                    throw ApiException.badRequest("Choose the client this login belongs to.");
                }
                if (users.existsByClientId(body.clientId())) {
                    throw ApiException.conflict("That client already has a login.");
                }
                user.setClientId(body.clientId());
            }
            case ADMIN -> { /* not linked to a record */ }
        }
        return view(users.save(user));
    }

    @PutMapping("/{id}")
    @Transactional
    public UserView update(@PathVariable int id, @RequestBody UpdateUser body) {
        AppUser user = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        if (body != null && body.enabled() != null && !body.enabled()) {
            guardLastAdmin(user, "disable");
            user.setEnabled(false);
        } else if (body != null && Boolean.TRUE.equals(body.enabled())) {
            user.setEnabled(true);
        }
        if (body != null && body.password() != null && !body.password().isEmpty()) {
            validatePassword(body.password());
            user.setPasswordHash(passwordEncoder.encode(body.password()));
        }
        return view(users.save(user));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable int id) {
        AppUser user = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        guardLastAdmin(user, "delete");
        users.delete(user);
    }

    static void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw ApiException.badRequest("Passwords must be at least 6 characters.");
        }
        if (password.length() > 72) {
            throw ApiException.badRequest("Passwords can be at most 72 characters.");
        }
    }

    /** You can't lock yourself out, and the app always keeps at least one active admin. */
    private void guardLastAdmin(AppUser user, String action) {
        AuthUser me = currentUser.require();
        if (user.getUserId().equals(me.getUserId())) {
            throw ApiException.badRequest("You can't " + action + " your own account.");
        }
        if (user.getRole() == Role.ADMIN && user.isEnabled() && users.countByRoleAndEnabledTrue(Role.ADMIN) <= 1) {
            throw ApiException.badRequest("You can't " + action + " the last active admin.");
        }
    }

    private UserView view(AppUser u) {
        String linked = null;
        if (u.getAgentId() != null) {
            linked = agents.findById(u.getAgentId()).map(a -> a.getName()).orElse(null);
        } else if (u.getClientId() != null) {
            linked = clients.findById(u.getClientId()).map(c -> c.getName()).orElse(null);
        }
        return new UserView(u.getUserId(), u.getUsername(), u.getRole(), u.getAgentId(), u.getClientId(), linked,
                u.isEnabled(), u.getCreatedAt(), u.getLastLogin());
    }
}
