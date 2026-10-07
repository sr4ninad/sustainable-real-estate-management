package com.realestate.sustainable_realestate.factory;

import com.realestate.sustainable_realestate.model.Property;

public class PropertyFactory {

    /**
     * Creates a property with sensible defaults for its category. The service only keeps
     * these defaults when the user didn't provide a rating or certification.
     */
    public static Property createProperty(String type) {

        Property property = new Property();
        String key = type == null ? "" : type.trim().toLowerCase();

        switch (key) {
            case "residential", "apartment", "villa" -> {
                property.setEnergyEfficiency("B");
                property.setGreenCertification("None");
            }
            case "commercial", "office" -> {
                property.setEnergyEfficiency("C");
                property.setGreenCertification("None");
            }
            default -> {
                property.setEnergyEfficiency("C");
                property.setGreenCertification("None");
            }
        }

        property.setType(type == null || type.isBlank() ? "General" : type.trim());
        property.setAvailabilityStatus("Available");
        return property;
    }
}
