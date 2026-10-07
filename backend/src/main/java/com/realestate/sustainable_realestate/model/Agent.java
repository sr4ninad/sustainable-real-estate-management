package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;

@Entity
@Table(name = "Agent")
public class Agent {

    @Id
    @Column(name = "Agent_ID")
    private int agentId;

    @Column(name = "Name")
    private String name;

    @Column(name = "Contact_No")
    private String contactNo;

    @Column(name = "Email")
    private String email;

    // getters setters
    public int getAgentId() { return agentId; }
    public void setAgentId(int agentId) { this.agentId = agentId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactNo() { return contactNo; }
    public void setContactNo(String contactNo) { this.contactNo = contactNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}