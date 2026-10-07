package com.realestate.sustainable_realestate.model;

import jakarta.persistence.*;

@Entity
@Table(name = "Sustainability_Features")
public class SustainabilityFeatures {

    @Id
    @Column(name = "Feature_ID")
    private int featureId;

    @Column(name = "Property_ID")
    private int propertyId;

    @Column(name = "Solar_Panels")
    private String solarPanels;

    @Column(name = "Rainwater_Harvesting")
    private String rainwaterHarvesting;

    @Column(name = "Waste_Management")
    private String wasteManagement;

    public int getFeatureId() {
        return featureId;
    }

    public void setFeatureId(int featureId) {
        this.featureId = featureId;
    }

    public int getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(int propertyId) {
        this.propertyId = propertyId;
    }

    public String getSolarPanels() {
        return solarPanels;
    }

    public void setSolarPanels(String solarPanels) {
        this.solarPanels = solarPanels;
    }

    public String getRainwaterHarvesting() {
        return rainwaterHarvesting;
    }

    public void setRainwaterHarvesting(String rainwaterHarvesting) {
        this.rainwaterHarvesting = rainwaterHarvesting;
    }

    public String getWasteManagement() {
        return wasteManagement;
    }

    public void setWasteManagement(String wasteManagement) {
        this.wasteManagement = wasteManagement;
    }
}