package com.realestate.sustainable_realestate.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;

/** The signed-in principal: username, role, and the Agent/Client record it belongs to. */
public class AuthUser implements UserDetails, Serializable {

    private final Integer userId;
    private final String username;
    private final String passwordHash;
    private final Role role;
    private final Integer agentId;
    private final Integer clientId;
    private final boolean enabled;

    public AuthUser(AppUser user) {
        this.userId = user.getUserId();
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.agentId = user.getAgentId();
        this.clientId = user.getClientId();
        this.enabled = user.isEnabled();
    }

    public Integer getUserId() { return userId; }
    public Role getRole() { return role; }
    public Integer getAgentId() { return agentId; }
    public Integer getClientId() { return clientId; }

    public boolean isAdmin() { return role == Role.ADMIN; }
    public boolean isAgent() { return role == Role.AGENT; }
    public boolean isClient() { return role == Role.CLIENT; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public String getUsername() { return username; }

    @Override
    public boolean isEnabled() { return enabled; }
}
