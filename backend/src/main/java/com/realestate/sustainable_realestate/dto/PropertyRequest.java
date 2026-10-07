package com.realestate.sustainable_realestate.dto;

import com.realestate.sustainable_realestate.model.Property;

/**
 * A property together with its three green features, saved in one transaction.
 * Feature flags are optional: null means "leave unchanged" on update, "No" on create.
 */
public record PropertyRequest(
        Integer propertyId,
        String address,
        String type,
        Integer size,
        Double price,
        String energyEfficiency,
        String greenCertification,
        String availabilityStatus,
        Integer agentId,
        Boolean solarPanels,
        Boolean rainwaterHarvesting,
        Boolean wasteManagement) {

    public Property toProperty() {
        Property p = new Property();
        p.setPropertyId(propertyId == null ? 0 : propertyId);
        p.setAddress(address);
        p.setType(type);
        p.setSize(size);
        p.setPrice(price == null ? 0 : price);
        p.setEnergyEfficiency(energyEfficiency);
        p.setGreenCertification(greenCertification);
        p.setAvailabilityStatus(availabilityStatus);
        p.setAgentId(agentId);
        return p;
    }
}
