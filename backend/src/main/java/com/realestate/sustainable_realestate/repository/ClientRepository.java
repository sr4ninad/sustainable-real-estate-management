package com.realestate.sustainable_realestate.repository;

import com.realestate.sustainable_realestate.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Integer> {
}