package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.model.Agent;
import com.realestate.sustainable_realestate.service.AgentService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    // 🔹 ADMIN CONSOLE (THYMELEAF)
    @GetMapping("/agents")
    public String getAgentsPage(Model model) {
        model.addAttribute("agents", agentService.getAllAgents());
        return "agents";
    }

    @PostMapping("/addAgent")
    public String addAgentForm(Agent agent) {
        agentService.saveFromForm(agent);
        return "redirect:/agents";
    }

    @PostMapping("/deleteAgent/{id}")
    public String deleteAgentForm(@PathVariable int id) {
        agentService.deleteAgent(id);
        return "redirect:/agents";
    }

    // 🔹 API
    @GetMapping("/api/agents")
    @ResponseBody
    public List<Agent> getAgents() {
        return agentService.getAllAgents();
    }

    @PostMapping("/api/agents")
    @ResponseBody
    public Agent addAgent(@RequestBody Agent agent) {
        return agentService.create(agent);
    }

    @PutMapping("/api/agents/{id}")
    @ResponseBody
    public Agent updateAgent(@PathVariable int id, @RequestBody Agent agent) {
        return agentService.update(id, agent);
    }

    @DeleteMapping("/api/agents/{id}")
    @ResponseBody
    public void deleteAgent(@PathVariable int id) {
        agentService.deleteAgent(id);
    }

    // 🔥 STORED PROCEDURE: calculate_agent_commission
    @GetMapping("/api/agents/{id}/commission")
    @ResponseBody
    public Map<String, Object> getCommission(@PathVariable int id) {
        return agentService.getCommission(id);
    }
}
