package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.model.SustainabilityFeatures;
import com.realestate.sustainable_realestate.repository.PropertyRepository;
import com.realestate.sustainable_realestate.repository.SustainabilityRepository;
import com.realestate.sustainable_realestate.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SustainabilityService {

    private final SustainabilityRepository repo;
    private final PropertyRepository properties;
    private final CurrentUser currentUser;

    public SustainabilityService(SustainabilityRepository repo, PropertyRepository properties, CurrentUser currentUser) {
        this.repo = repo;
        this.properties = properties;
        this.currentUser = currentUser;
    }

    public List<SustainabilityFeatures> getAll() {
        return repo.findAll();
    }

    @Transactional
    public SustainabilityFeatures create(SustainabilityFeatures f) {
        Property property = requireEditableProperty(f.getPropertyId());
        if (f.getFeatureId() <= 0) {
            throw ApiException.badRequest("Feature ID must be a positive number.");
        }
        if (repo.existsById(f.getFeatureId())) {
            throw ApiException.conflict("Feature record " + f.getFeatureId() + " already exists.");
        }
        if (!repo.findByPropertyId(property.getPropertyId()).isEmpty()) {
            throw ApiException.conflict("Property " + property.getPropertyId() + " already has a sustainability record.");
        }
        normalise(f);
        return repo.save(f);
    }

    @Transactional
    public SustainabilityFeatures update(int id, SustainabilityFeatures f) {
        SustainabilityFeatures existing = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Feature record " + id + " not found."));
        requireEditableProperty(existing.getPropertyId());
        if (f.getPropertyId() != existing.getPropertyId()) {
            throw ApiException.badRequest("A feature record can't be moved to another property.");
        }
        f.setFeatureId(id);
        normalise(f);
        return repo.save(f);
    }

    @Transactional
    public void delete(int id) {
        SustainabilityFeatures existing = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Feature record " + id + " not found."));
        requireEditableProperty(existing.getPropertyId());
        repo.delete(existing);
    }

    /** Creates or updates the single features row of a property (used when saving a property). */
    @Transactional
    public void upsertForProperty(int propertyId, Boolean solar, Boolean rain, Boolean waste) {
        SustainabilityFeatures f = repo.findByPropertyId(propertyId).stream().findFirst().orElse(null);
        if (f == null) {
            f = new SustainabilityFeatures();
            f.setFeatureId(repo.findAll().stream().mapToInt(SustainabilityFeatures::getFeatureId).max().orElse(400) + 1);
            f.setPropertyId(propertyId);
            f.setSolarPanels("No");
            f.setRainwaterHarvesting("No");
            f.setWasteManagement("No");
        }
        if (solar != null) f.setSolarPanels(solar ? "Yes" : "No");
        if (rain != null) f.setRainwaterHarvesting(rain ? "Yes" : "No");
        if (waste != null) f.setWasteManagement(waste ? "Yes" : "No");
        repo.save(f);
    }

    private Property requireEditableProperty(int propertyId) {
        Property property = properties.findById(propertyId)
                .orElseThrow(() -> ApiException.badRequest("Property " + propertyId + " doesn't exist."));
        currentUser.requireListingAccess(property.getAgentId());
        return property;
    }

    private static void normalise(SustainabilityFeatures f) {
        f.setSolarPanels(yesNo(f.getSolarPanels(), "Solar panels"));
        f.setRainwaterHarvesting(yesNo(f.getRainwaterHarvesting(), "Rainwater harvesting"));
        f.setWasteManagement(yesNo(f.getWasteManagement(), "Waste management"));
    }

    private static String yesNo(String value, String label) {
        if (value == null) return "No";
        if (value.equalsIgnoreCase("yes")) return "Yes";
        if (value.equalsIgnoreCase("no")) return "No";
        throw ApiException.badRequest(label + " must be Yes or No.");
    }
}
