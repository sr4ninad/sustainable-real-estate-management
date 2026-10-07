package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.model.Agent;
import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.PropertyRepository;
import com.realestate.sustainable_realestate.security.AppUserRepository;
import com.realestate.sustainable_realestate.security.AuthUser;
import com.realestate.sustainable_realestate.security.CurrentUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final AgentRepository repo;
    private final PropertyRepository propertyRepository;
    private final AppUserRepository userRepository;
    private final CurrentUser currentUser;

    @PersistenceContext
    private EntityManager entityManager;

    public AgentService(AgentRepository repo, PropertyRepository propertyRepository,
                        AppUserRepository userRepository, CurrentUser currentUser) {
        this.repo = repo;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public List<Agent> getAllAgents() {
        return repo.findAll();
    }

    @Transactional
    public Agent create(Agent agent) {
        currentUser.requireAdmin();
        Validation.positiveId(agent.getAgentId(), "Agent ID");
        if (repo.existsById(agent.getAgentId())) {
            throw ApiException.conflict("Agent ID " + agent.getAgentId() + " is already in use.");
        }
        return repo.save(build(agent));
    }

    /** Admins can edit any agent; an agent can edit their own contact details. */
    @Transactional
    public Agent update(int id, Agent agent) {
        if (!repo.existsById(id)) {
            throw ApiException.notFound("Agent " + id + " not found.");
        }
        AuthUser user = currentUser.require();
        if (!user.isAdmin() && !(user.isAgent() && Integer.valueOf(id).equals(user.getAgentId()))) {
            throw ApiException.forbidden("You can only edit your own profile.");
        }
        agent.setAgentId(id);
        return repo.save(build(agent));
    }

    /** Admin console form: "Add" doubles as update when the ID exists. */
    @Transactional
    public void saveFromForm(Agent agent) {
        if (agent.getAgentId() > 0 && repo.existsById(agent.getAgentId())) {
            update(agent.getAgentId(), agent);
        } else {
            create(agent);
        }
    }

    private static Agent build(Agent input) {
        Agent agent = new Agent();
        agent.setAgentId(input.getAgentId());
        agent.setName(Validation.name(input.getName()));
        agent.setEmail(Validation.email(input.getEmail()));
        agent.setContactNo(Validation.phone(input.getContactNo()));
        return agent;
    }

    @Transactional
    public void deleteAgent(int id) {
        currentUser.requireAdmin();
        if (!repo.existsById(id)) {
            throw ApiException.notFound("Agent " + id + " not found.");
        }
        if (propertyRepository.existsByAgentId(id)) {
            throw ApiException.conflict("This agent still has listings. Reassign them first.");
        }
        userRepository.findAll().stream()
                .filter(u -> Integer.valueOf(id).equals(u.getAgentId()))
                .forEach(userRepository::delete);
        repo.deleteById(id);
        log.info("Agent {} deleted", id);
    }

    /** calculate_agent_commission(id): sales count, closed value and 3% commission. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getCommission(int id) {
        AuthUser user = currentUser.require();
        if (!user.isAdmin() && !(user.isAgent() && Integer.valueOf(id).equals(user.getAgentId()))) {
            throw ApiException.forbidden("You can only view your own commission.");
        }
        if (!repo.existsById(id)) {
            throw ApiException.notFound("Agent " + id + " not found.");
        }
        List<Object[]> rows = entityManager.createNativeQuery("CALL calculate_agent_commission(?)")
                .setParameter(1, id)
                .getResultList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("agentId", id);
        if (rows.isEmpty()) {
            result.put("totalSales", 0);
            result.put("totalSalesValue", 0.0);
            result.put("totalCommission", 0.0);
            return result;
        }
        Object[] row = rows.get(0);
        result.put("name", row[1]);
        result.put("totalSales", ((Number) row[2]).intValue());
        result.put("totalSalesValue", row[3] == null ? 0.0 : ((Number) row[3]).doubleValue());
        result.put("totalCommission", row[4] == null ? 0.0 : ((Number) row[4]).doubleValue());
        return result;
    }
}
