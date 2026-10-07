package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.model.PropertyUpdateLog;
import com.realestate.sustainable_realestate.repository.PropertyUpdateLogRepository;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
public class LogController {

    private final PropertyUpdateLogRepository repo;

    public LogController(PropertyUpdateLogRepository repo) {
        this.repo = repo;
    }

    // =========================
    // 🔹 API (REACT FRONTEND)
    // =========================
    @GetMapping("/api/logs")
    @ResponseBody
    public List<PropertyUpdateLog> getLogs() {
        return repo.findAll();
    }

    // =========================
    // 🔹 ADMIN CONSOLE (THYMELEAF)
    // =========================
    @GetMapping("/logs")
    public String logsPage(Model model) {
        model.addAttribute("logs", repo.findAll());
        return "logs"; // loads logs.html
    }
}
