package com.realestate.sustainable_realestate.repository;

import com.realestate.sustainable_realestate.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyRepository extends JpaRepository<Property, Integer> {

    // 🔒 Used to stop deleting an agent who still has listings
    boolean existsByAgentId(Integer agentId);

}
