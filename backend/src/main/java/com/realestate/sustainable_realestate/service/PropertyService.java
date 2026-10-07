package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.adapter.PropertyAdapter;
import com.realestate.sustainable_realestate.dto.PropertyRequest;
import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.factory.PropertyFactory;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.PropertyRepository;
import com.realestate.sustainable_realestate.repository.SustainabilityRepository;
import com.realestate.sustainable_realestate.repository.TransactionRepository;
import com.realestate.sustainable_realestate.security.AuthUser;
import com.realestate.sustainable_realestate.security.CurrentUser;
import com.realestate.sustainable_realestate.strategy.PricingStrategy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PropertyService {

    private static final Logger log = LoggerFactory.getLogger(PropertyService.class);
    private static final Set<String> STATUSES = Set.of("Available", "Unavailable");

    private final PropertyRepository propertyRepository;
    private final SustainabilityRepository sustainabilityRepository;
    private final TransactionRepository transactionRepository;
    private final AgentRepository agentRepository;
    private final SustainabilityService sustainabilityService;
    private final CurrentUser currentUser;

    @PersistenceContext
    private EntityManager entityManager;

    public PropertyService(PropertyRepository propertyRepository, SustainabilityRepository sustainabilityRepository,
                           TransactionRepository transactionRepository, AgentRepository agentRepository,
                           SustainabilityService sustainabilityService, CurrentUser currentUser) {
        this.propertyRepository = propertyRepository;
        this.sustainabilityRepository = sustainabilityRepository;
        this.transactionRepository = transactionRepository;
        this.agentRepository = agentRepository;
        this.sustainabilityService = sustainabilityService;
        this.currentUser = currentUser;
    }

    // ✅ READ

    public List<Property> getAllProperties() {
        return propertyRepository.findAll();
    }

    public Property getProperty(int id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Property " + id + " not found."));
    }

    // 🔥 CREATE / UPDATE (FACTORY + OWNERSHIP RULES)

    @Transactional
    public Property create(Property property) {
        currentUser.requireAdminOrAgent();
        if (property.getPropertyId() > 0 && propertyRepository.existsById(property.getPropertyId())) {
            throw ApiException.conflict("Property ID " + property.getPropertyId() + " is already in use.");
        }
        AuthUser user = currentUser.require();
        if (user.isAgent()) {
            property.setAgentId(user.getAgentId()); // agents always list under their own name
        }
        return propertyRepository.save(build(property));
    }

    @Transactional
    public Property update(int id, Property property) {
        Property existing = getProperty(id);
        currentUser.requireListingAccess(existing.getAgentId());
        AuthUser user = currentUser.require();
        if (user.isAgent() && property.getAgentId() != null && !property.getAgentId().equals(user.getAgentId())) {
            throw ApiException.forbidden("Only an admin can reassign a listing to another agent.");
        }
        if (user.isAgent()) {
            property.setAgentId(existing.getAgentId());
        }
        property.setPropertyId(id);
        return propertyRepository.save(build(property));
    }

    /** Saves a property and its green features atomically. */
    @Transactional
    public Property saveWithFeatures(Integer id, PropertyRequest request) {
        Property saved = id == null ? create(request.toProperty()) : update(id, request.toProperty());
        boolean creating = id == null;
        sustainabilityService.upsertForProperty(saved.getPropertyId(),
                flag(request.solarPanels(), creating),
                flag(request.rainwaterHarvesting(), creating),
                flag(request.wasteManagement(), creating));
        return saved;
    }

    private static Boolean flag(Boolean value, boolean creating) {
        return value == null && creating ? Boolean.FALSE : value;
    }

    /** Admin console form: "Add / Update" in one form. */
    @Transactional
    public void saveFromForm(Property property) {
        if (property.getPropertyId() > 0 && propertyRepository.existsById(property.getPropertyId())) {
            Property existing = getProperty(property.getPropertyId());
            mergeMissing(property, existing);
            update(property.getPropertyId(), property);
        } else {
            create(property);
        }
    }

    /** Admin console "Update Property" card: only the fields it shows are changed. */
    @Transactional
    public void updateFromForm(Property partial) {
        Property existing = getProperty(partial.getPropertyId());
        mergeMissing(partial, existing);
        update(existing.getPropertyId(), partial);
    }

    private static void mergeMissing(Property target, Property existing) {
        if (isBlank(target.getAddress())) target.setAddress(existing.getAddress());
        if (isBlank(target.getType())) target.setType(existing.getType());
        if (target.getSize() == null) target.setSize(existing.getSize());
        if (target.getPrice() <= 0) target.setPrice(existing.getPrice());
        if (isBlank(target.getEnergyEfficiency())) target.setEnergyEfficiency(existing.getEnergyEfficiency());
        if (isBlank(target.getGreenCertification())) target.setGreenCertification(existing.getGreenCertification());
        if (isBlank(target.getAvailabilityStatus())) target.setAvailabilityStatus(existing.getAvailabilityStatus());
        if (target.getAgentId() == null) target.setAgentId(existing.getAgentId());
    }

    /** Validates the input and fills in factory defaults for anything not provided. */
    private Property build(Property input) {
        validate(input);

        Property property = PropertyFactory.createProperty(input.getType());
        property.setPropertyId(input.getPropertyId());
        property.setAddress(input.getAddress().trim());
        property.setSize(input.getSize());
        property.setPrice(input.getPrice());
        property.setAgentId(input.getAgentId());
        if (!isBlank(input.getAvailabilityStatus())) {
            property.setAvailabilityStatus(input.getAvailabilityStatus());
        }
        // Factory values are only defaults: keep what the user actually entered.
        if (!isBlank(input.getEnergyEfficiency())) {
            property.setEnergyEfficiency(input.getEnergyEfficiency().trim().toUpperCase());
        }
        if (!isBlank(input.getGreenCertification())) {
            property.setGreenCertification(input.getGreenCertification().trim());
        }
        return property;
    }

    private void validate(Property p) {
        if (p.getPropertyId() <= 0) {
            throw ApiException.badRequest("Property ID must be a positive number.");
        }
        if (isBlank(p.getAddress())) {
            throw ApiException.badRequest("Address is required.");
        }
        if (p.getAddress().trim().length() > 255) {
            throw ApiException.badRequest("Address can be at most 255 characters.");
        }
        if (!(p.getPrice() > 0)) {
            throw ApiException.badRequest("Price must be greater than zero.");
        }
        if (p.getSize() != null && p.getSize() <= 0) {
            throw ApiException.badRequest("Size must be greater than zero.");
        }
        if (!isBlank(p.getAvailabilityStatus()) && !STATUSES.contains(p.getAvailabilityStatus())) {
            throw ApiException.badRequest("Status must be Available or Unavailable.");
        }
        if (!isBlank(p.getEnergyEfficiency()) && p.getEnergyEfficiency().trim().length() > 10) {
            throw ApiException.badRequest("Energy rating can be at most 10 characters (e.g. A+, A, B).");
        }
        if (!isBlank(p.getGreenCertification()) && p.getGreenCertification().trim().length() > 50) {
            throw ApiException.badRequest("Certification can be at most 50 characters.");
        }
        if (!isBlank(p.getType()) && p.getType().trim().length() > 50) {
            throw ApiException.badRequest("Type can be at most 50 characters.");
        }
        if (p.getAgentId() != null && !agentRepository.existsById(p.getAgentId())) {
            throw ApiException.badRequest("Agent " + p.getAgentId() + " doesn't exist.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // 🔥 SAFE DELETE (also removes the property's sustainability record)

    @Transactional
    public void deleteProperty(int id) {
        Property existing = getProperty(id);
        currentUser.requireListingAccess(existing.getAgentId());
        if (transactionRepository.existsByPropertyId(id)) {
            throw ApiException.conflict("This property has transactions on record. Delete those first.");
        }
        sustainabilityRepository.deleteAll(sustainabilityRepository.findByPropertyId(id));
        sustainabilityRepository.flush();
        propertyRepository.deleteById(id);
        log.info("Property {} deleted by {}", id, currentUser.require().getUsername());
    }

    // 🔥 STORED PROCEDURES

    @SuppressWarnings("unchecked")
    private List<Object[]> sustainabilityRows(int min) {
        if (min < 0 || min > 3) {
            throw ApiException.badRequest("Minimum features must be between 0 and 3.");
        }
        return entityManager.createNativeQuery("CALL get_properties_by_sustainability(?)")
                .setParameter(1, min)
                .getResultList();
    }

    /** get_properties_by_sustainability as named fields instead of positional arrays. */
    public List<Map<String, Object>> getPropertiesBySustainability(int min) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : sustainabilityRows(min)) {
            Property p = PropertyAdapter.adapt(row);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("propertyId", p.getPropertyId());
            m.put("address", p.getAddress());
            m.put("price", p.getPrice());
            m.put("featureCount", PropertyAdapter.featureCount(row));
            result.add(m);
        }
        return result;
    }

    // 🧱 ADAPTER PATTERN USED HERE
    public List<Property> getAdaptedProperties(int min) {
        return sustainabilityRows(min).stream().map(PropertyAdapter::adapt).toList();
    }

    /** get_properties_by_efficiency: number of properties per energy rating. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getEfficiencySummary() {
        List<Object[]> rows = entityManager.createNativeQuery("CALL get_properties_by_efficiency()").getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("energyEfficiency", row[0]);
            m.put("count", ((Number) row[1]).intValue());
            result.add(m);
        }
        return result;
    }

    // 🔁 STRATEGY + SINGLETON

    public double applyPricingStrategy(String type, double price) {
        if (price < 0) {
            throw ApiException.badRequest("Price can't be negative.");
        }
        return PricingStrategy.forClientType(type).calculate(price);
    }

    /** Every property priced for a client type. Returns copies, so stored entities are never modified. */
    public List<Property> getPropertiesWithStrategy(String type) {
        PricingStrategy strategy = PricingStrategy.forClientType(type);
        return propertyRepository.findAll().stream().map(p -> {
            Property copy = copyOf(p);
            copy.setPrice(strategy.calculate(p.getPrice()));
            return copy;
        }).toList();
    }

    private static Property copyOf(Property p) {
        Property c = new Property();
        c.setPropertyId(p.getPropertyId());
        c.setAddress(p.getAddress());
        c.setType(p.getType());
        c.setSize(p.getSize());
        c.setPrice(p.getPrice());
        c.setEnergyEfficiency(p.getEnergyEfficiency());
        c.setGreenCertification(p.getGreenCertification());
        c.setAvailabilityStatus(p.getAvailabilityStatus());
        c.setAgentId(p.getAgentId());
        return c;
    }

    // 🔥 MYSQL FUNCTIONS

    public Double calculatePricePerSqft(int id) {
        getProperty(id);
        Object result = entityManager.createNativeQuery("SELECT calculate_price_per_sqft(?)")
                .setParameter(1, id)
                .getSingleResult();
        return result != null ? ((Number) result).doubleValue() : 0.0;
    }

    public Double calculatePropertyTax(int id) {
        getProperty(id);
        Object result = entityManager.createNativeQuery("SELECT calculate_property_tax(?)")
                .setParameter(1, id)
                .getSingleResult();
        return result != null ? ((Number) result).doubleValue() : 0.0;
    }
}
