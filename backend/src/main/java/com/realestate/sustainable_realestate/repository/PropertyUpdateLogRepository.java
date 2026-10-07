package com.realestate.sustainable_realestate.repository;

import com.realestate.sustainable_realestate.model.PropertyUpdateLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyUpdateLogRepository extends JpaRepository<PropertyUpdateLog, Integer> {
}