package com.realestate.sustainable_realestate.security;

import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.ClientRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * On startup: makes sure the admin account exists and (optionally) gives every agent and
 * client a demo login — agent{id} / client{id} — so the app can be demoed immediately.
 */
@Component
public class AccountSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AccountSeeder.class);

    private final AppUserRepository users;
    private final AgentRepository agents;
    private final ClientRepository clients;
    private final PasswordEncoder encoder;

    @Value("${app.admin.username}")
    private String adminUsername;
    @Value("${app.admin.password}")
    private String adminPassword;
    @Value("${app.demo-users.enabled}")
    private boolean demoUsers;
    @Value("${app.demo-users.agent-password}")
    private String agentPassword;
    @Value("${app.demo-users.client-password}")
    private String clientPassword;

    public AccountSeeder(AppUserRepository users, AgentRepository agents, ClientRepository clients,
                         PasswordEncoder encoder) {
        this.users = users;
        this.agents = agents;
        this.clients = clients;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            seed();
        } catch (DataAccessException e) {
            log.error("Could not create login accounts. Is the App_User table missing? "
                    + "Run database/upgrade.sql on an existing database. Cause: {}", e.getMostSpecificCause().getMessage());
        }
    }

    void seed() {
        if (!users.existsByUsernameIgnoreCase(adminUsername)) {
            users.save(account(adminUsername, adminPassword, Role.ADMIN, null, null));
            log.info("Created admin account '{}'", adminUsername);
        }
        if (!demoUsers) return;

        int created = 0;
        for (var agent : agents.findAll()) {
            String username = "agent" + agent.getAgentId();
            if (!users.existsByAgentId(agent.getAgentId()) && !users.existsByUsernameIgnoreCase(username)) {
                users.save(account(username, agentPassword, Role.AGENT, agent.getAgentId(), null));
                created++;
            }
        }
        for (var client : clients.findAll()) {
            String username = "client" + client.getClientId();
            if (!users.existsByClientId(client.getClientId()) && !users.existsByUsernameIgnoreCase(username)) {
                users.save(account(username, clientPassword, Role.CLIENT, null, client.getClientId()));
                created++;
            }
        }
        if (created > 0) {
            log.info("Created {} demo logins (agent<id> / client<id>)", created);
        }
    }

    private AppUser account(String username, String password, Role role, Integer agentId, Integer clientId) {
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(password));
        user.setRole(role);
        user.setAgentId(agentId);
        user.setClientId(clientId);
        return user;
    }
}
