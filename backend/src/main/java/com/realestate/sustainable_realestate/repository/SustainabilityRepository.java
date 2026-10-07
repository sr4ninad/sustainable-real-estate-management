package com.realestate.sustainable_realestate.repository;

import com.realestate.sustainable_realestate.model.SustainabilityFeatures;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SustainabilityRepository extends JpaRepository<SustainabilityFeatures, Integer> {

    List<SustainabilityFeatures> findByPropertyId(int propertyId);
}
