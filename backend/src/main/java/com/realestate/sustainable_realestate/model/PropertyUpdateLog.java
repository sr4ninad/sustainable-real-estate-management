package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Property_Update_Log")
public class PropertyUpdateLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Log_ID")
    private int logId;

    @Column(name = "Property_ID")
    private int propertyId;

    @Column(name = "Old_Price")
    private double oldPrice;

    @Column(name = "New_Price")
    private double newPrice;

    @Column(name = "Updated_At")
    private LocalDateTime updatedAt;

    public int getLogId() {
        return logId;
    }

    public void setLogId(int logId) {
        this.logId = logId;
    }

    public int getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(int propertyId) {
        this.propertyId = propertyId;
    }

    public double getOldPrice() {
        return oldPrice;
    }

    public void setOldPrice(double oldPrice) {
        this.oldPrice = oldPrice;
    }

    public double getNewPrice() {
        return newPrice;
    }

    public void setNewPrice(double newPrice) {
        this.newPrice = newPrice;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}