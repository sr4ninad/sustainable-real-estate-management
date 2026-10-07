package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.model.SustainabilityFeatures;
import com.realestate.sustainable_realestate.service.SustainabilityService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
public class SustainabilityController {

    private final SustainabilityService service;

    public SustainabilityController(SustainabilityService service) {
        this.service = service;
    }

    // ✅ API (React uses this)
    @GetMapping("/api/features")
    @ResponseBody
    public List<SustainabilityFeatures> getAll() {
        return service.getAll();
    }

    @PostMapping("/api/features")
    @ResponseBody
    public SustainabilityFeatures create(@RequestBody SustainabilityFeatures features) {
        return service.create(features);
    }

    @PutMapping("/api/features/{id}")
    @ResponseBody
    public SustainabilityFeatures update(@PathVariable int id, @RequestBody SustainabilityFeatures features) {
        return service.update(id, features);
    }

    @DeleteMapping("/api/features/{id}")
    @ResponseBody
    public void delete(@PathVariable int id) {
        service.delete(id);
    }

    // ✅ ADMIN CONSOLE PAGE
    @GetMapping("/features")
    public String featuresPage(Model model) {
        model.addAttribute("features", service.getAll());
        return "features";
    }
}
