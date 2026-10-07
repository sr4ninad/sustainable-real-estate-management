package com.realestate.sustainable_realestate.repository;

import com.realestate.sustainable_realestate.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Integer> {

    List<Transaction> findByClientId(int clientId);

    boolean existsByPropertyId(int propertyId);

    boolean existsByClientId(int clientId);
}
