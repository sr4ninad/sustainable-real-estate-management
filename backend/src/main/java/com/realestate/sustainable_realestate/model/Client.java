package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;

@Entity
@Table(name = "Client")
public class Client {

    @Id
    @Column(name = "Client_ID")
    private int clientId;

    @Column(name = "Name")
    private String name;

    @Column(name = "Contact_No")
    private String contactNo;

    @Column(name = "Email")
    private String email;

    @Column(name = "Type")
    private String type;

    // 🔥 IMPORTANT FIX (matches DB column)
    @Column(name = "client_category")
    private String clientCategory;

    public Client() {}

    public int getClientId() { return clientId; }
    public void setClientId(int clientId) { this.clientId = clientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactNo() { return contactNo; }
    public void setContactNo(String contactNo) { this.contactNo = contactNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    // 🔥 NEW GETTERS/SETTERS
    public String getClientCategory() { return clientCategory; }
    public void setClientCategory(String clientCategory) { this.clientCategory = clientCategory; }
}