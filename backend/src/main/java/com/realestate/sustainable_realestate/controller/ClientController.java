package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.model.Client;
import com.realestate.sustainable_realestate.service.ClientService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    // =========================
    // 🔹 ADMIN CONSOLE (THYMELEAF)
    // =========================

    @GetMapping("/clients")
    public String getClientsPage(Model model) {
        model.addAttribute("clients", clientService.getAllClients());
        return "clients";
    }

    @PostMapping("/addClient")
    public String addClientForm(Client client) {
        clientService.saveFromForm(client);
        return "redirect:/clients";
    }

    @PostMapping("/deleteClient/{id}")
    public String deleteClientForm(@PathVariable int id) {
        clientService.deleteClient(id);
        return "redirect:/clients";
    }

    // =========================
    // 🔹 API (REACT FRONTEND)
    // =========================

    @GetMapping("/api/clients")
    @ResponseBody
    public List<Client> getClients() {
        return clientService.getAllClients();
    }

    // 🔥 STORED PROCEDURE (mapped before /{id} so it isn't read as an ID)
    @GetMapping("/api/clients/with-transactions")
    @ResponseBody
    public List<Map<String, Object>> getClientsWithTransactions() {
        return clientService.getClientsWithTransactions();
    }

    @GetMapping("/api/clients/{id}")
    @ResponseBody
    public Client getClient(@PathVariable int id) {
        return clientService.getClientById(id);
    }

    @PostMapping("/api/clients")
    @ResponseBody
    public Client addClient(@RequestBody Client client) {
        return clientService.create(client);
    }

    @PutMapping("/api/clients/{id}")
    @ResponseBody
    public Client updateClient(@PathVariable int id, @RequestBody Client client) {
        return clientService.update(id, client);
    }

    @DeleteMapping("/api/clients/{id}")
    @ResponseBody
    public void deleteClient(@PathVariable int id) {
        clientService.deleteClient(id);
    }
}
