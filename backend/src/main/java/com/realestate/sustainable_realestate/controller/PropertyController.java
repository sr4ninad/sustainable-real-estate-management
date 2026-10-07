package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.dto.PropertyRequest;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.service.PropertyService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    // =========================
    // 🔹 ADMIN CONSOLE (THYMELEAF)
    // =========================

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("properties", propertyService.getAllProperties());
        return "index";
    }

    @GetMapping("/properties")
    public String propertiesPage(Model model) {
        model.addAttribute("properties", propertyService.getAllProperties());
        return "properties";
    }

    @PostMapping("/addProperty")
    public String addProperty(Property property,
                              @RequestParam(value = "returnTo", defaultValue = "/") String returnTo) {
        propertyService.saveFromForm(property);
        return redirect(returnTo);
    }

    @PostMapping("/updateProperty")
    public String updateProperty(Property property) {
        propertyService.updateFromForm(property);
        return "redirect:/";
    }

    @PostMapping("/deleteProperty/{id}")
    public String deleteProperty(@PathVariable int id,
                                 @RequestParam(value = "returnTo", defaultValue = "/") String returnTo) {
        propertyService.deleteProperty(id);
        return redirect(returnTo);
    }

    private static String redirect(String returnTo) {
        return "/properties".equals(returnTo) ? "redirect:/properties" : "redirect:/";
    }

    // =========================
    // 🔹 API (REACT FRONTEND)
    // =========================

    @GetMapping("/api/properties")
    @ResponseBody
    public List<Property> getAll() {
        return propertyService.getAllProperties();
    }

    @GetMapping("/api/properties/{id}")
    @ResponseBody
    public Property getOne(@PathVariable int id) {
        return propertyService.getProperty(id);
    }

    @PostMapping("/api/properties")
    @ResponseBody
    public Property add(@RequestBody Property property) {
        return propertyService.create(property);
    }

    @PutMapping("/api/properties/{id}")
    @ResponseBody
    public Property update(@PathVariable int id, @RequestBody Property property) {
        return propertyService.update(id, property);
    }

    // Property + green features saved in one transaction
    @PostMapping("/api/properties/full")
    @ResponseBody
    public Property addFull(@RequestBody PropertyRequest request) {
        return propertyService.saveWithFeatures(null, request);
    }

    @PutMapping("/api/properties/{id}/full")
    @ResponseBody
    public Property updateFull(@PathVariable int id, @RequestBody PropertyRequest request) {
        return propertyService.saveWithFeatures(id, request);
    }

    @DeleteMapping("/api/properties/{id}")
    @ResponseBody
    public void delete(@PathVariable int id) {
        propertyService.deleteProperty(id);
    }

    // =========================
    // 🔥 STORED PROCEDURES
    // =========================

    @GetMapping("/api/properties/filter/{min}")
    @ResponseBody
    public List<Map<String, Object>> filterBySustainability(@PathVariable int min) {
        return propertyService.getPropertiesBySustainability(min);
    }

    @GetMapping("/api/properties/efficiency")
    @ResponseBody
    public List<Map<String, Object>> efficiencySummary() {
        return propertyService.getEfficiencySummary();
    }

    // =========================
    // 🧱 ADAPTER (CLEAN DATA)
    // =========================

    @GetMapping("/api/properties/adapted/{min}")
    @ResponseBody
    public List<Property> getAdaptedProperties(@PathVariable int min) {
        return propertyService.getAdaptedProperties(min);
    }

    // =========================
    // 🔁 STRATEGY
    // =========================

    @GetMapping("/api/properties/price/{type}/{price}")
    @ResponseBody
    public double getPriceWithStrategy(@PathVariable String type, @PathVariable double price) {
        return propertyService.applyPricingStrategy(type, price);
    }

    @GetMapping("/api/properties/with-strategy/{type}")
    @ResponseBody
    public List<Property> getPropertiesWithStrategy(@PathVariable String type) {
        return propertyService.getPropertiesWithStrategy(type);
    }

    // =========================
    // 🔥 MYSQL FUNCTIONS
    // =========================

    @GetMapping("/api/functions/price-per-sqft/{id}")
    @ResponseBody
    public Double getPricePerSqft(@PathVariable int id) {
        return propertyService.calculatePricePerSqft(id);
    }

    @GetMapping("/api/functions/property-tax/{id}")
    @ResponseBody
    public Double getPropertyTax(@PathVariable int id) {
        return propertyService.calculatePropertyTax(id);
    }
}
