//information expert
// 

package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;

@Entity
@Table(name = "Property")
public class Property {

    @Id
    @Column(name = "Property_ID")
    private int propertyId;

    @Column(name = "Address")
    private String address;

    @Column(name = "Type")
    private String type;

    // 🔥 FIX (was int → now Integer)
    @Column(name = "Size")
    private Integer size;

    @Column(name = "Price")
    private double price;

    @Column(name = "Energy_Efficiency")
    private String energyEfficiency;

    @Column(name = "Green_Certification")
    private String greenCertification;

    @Column(name = "Availability_Status")
    private String availabilityStatus;

    @Column(name = "Agent_ID")
    private Integer agentId;

    // getters setters

    public int getPropertyId() { return propertyId; }
    public void setPropertyId(int propertyId) { this.propertyId = propertyId; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getSize() { return size; }
    public void setSize(Integer size) { this.size = size; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public String getEnergyEfficiency() { return energyEfficiency; }
    public void setEnergyEfficiency(String energyEfficiency) { this.energyEfficiency = energyEfficiency; }

    public String getGreenCertification() { return greenCertification; }
    public void setGreenCertification(String greenCertification) { this.greenCertification = greenCertification; }

    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }

    public Integer getAgentId() { return agentId; }
    public void setAgentId(Integer agentId) { this.agentId = agentId; }
}