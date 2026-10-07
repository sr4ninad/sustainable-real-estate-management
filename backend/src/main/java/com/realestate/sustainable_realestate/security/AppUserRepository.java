package com.realestate.sustainable_realestate.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Integer> {

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByAgentId(Integer agentId);

    boolean existsByClientId(Integer clientId);

    long countByRoleAndEnabledTrue(Role role);
}
