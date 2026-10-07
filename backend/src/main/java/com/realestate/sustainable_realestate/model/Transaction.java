package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "Transaction")
public class Transaction {

    @Id
    @Column(name = "Transaction_ID")
    private int transactionId;

    @Column(name = "Date")
    private LocalDate date;

    @Column(name = "Amount")
    private double amount;

    // 🔥 SIMPLE (MATCHES FORM)
    @Column(name = "Property_ID")
    private int propertyId;

    @Column(name = "Client_ID")
    private int clientId;

    // getters setters
    public int getTransactionId() { return transactionId; }
    public void setTransactionId(int transactionId) { this.transactionId = transactionId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public int getPropertyId() { return propertyId; }
    public void setPropertyId(int propertyId) { this.propertyId = propertyId; }

    public int getClientId() { return clientId; }
    public void setClientId(int clientId) { this.clientId = clientId; }
}