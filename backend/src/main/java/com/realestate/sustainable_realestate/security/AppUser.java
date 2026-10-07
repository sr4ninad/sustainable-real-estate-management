package com.realestate.sustainable_realestate.security;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** A login account. AGENT and CLIENT accounts are linked to their Agent / Client record. */
@Entity
@Table(name = "App_User")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "User_ID")
    private Integer userId;

    @Column(name = "Username", nullable = false, unique = true)
    private String username;

    @Column(name = "Password_Hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "Role", nullable = false)
    private Role role;

    @Column(name = "Agent_ID")
    private Integer agentId;

    @Column(name = "Client_ID")
    private Integer clientId;

    @Column(name = "Enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "Created_At", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "Last_Login")
    private LocalDateTime lastLogin;

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Integer getAgentId() { return agentId; }
    public void setAgentId(Integer agentId) { this.agentId = agentId; }

    public Integer getClientId() { return clientId; }
    public void setClientId(Integer clientId) { this.clientId = clientId; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }
}
