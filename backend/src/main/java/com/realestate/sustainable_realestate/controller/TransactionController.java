package com.realestate.sustainable_realestate.controller;

import com.realestate.sustainable_realestate.model.Transaction;
import com.realestate.sustainable_realestate.service.TransactionService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    // 🔹 ADMIN CONSOLE (THYMELEAF)
    @GetMapping("/transactions")
    public String getTransactionsPage(Model model) {
        model.addAttribute("transactions", service.getAllTransactions());
        return "transactions";
    }

    @PostMapping("/addTransaction")
    public String addTransactionForm(Transaction t) {
        service.saveFromForm(t);
        return "redirect:/transactions";
    }

    @PostMapping("/deleteTransaction/{id}")
    public String deleteTransactionForm(@PathVariable int id) {
        service.deleteTransaction(id);
        return "redirect:/transactions";
    }

    // 🔹 API
    @GetMapping("/api/transactions")
    @ResponseBody
    public List<Transaction> getTransactions() {
        return service.getAllTransactions();
    }

    @PostMapping("/api/transactions")
    @ResponseBody
    public Transaction addTransaction(@RequestBody Transaction t) {
        return service.create(t);
    }

    @PutMapping("/api/transactions/{id}")
    @ResponseBody
    public Transaction updateTransaction(@PathVariable int id, @RequestBody Transaction t) {
        return service.update(id, t);
    }

    @DeleteMapping("/api/transactions/{id}")
    @ResponseBody
    public void deleteTransaction(@PathVariable int id) {
        service.deleteTransaction(id);
    }
}
