package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.model.Transaction;
import com.realestate.sustainable_realestate.repository.ClientRepository;
import com.realestate.sustainable_realestate.repository.PropertyRepository;
import com.realestate.sustainable_realestate.repository.TransactionRepository;
import com.realestate.sustainable_realestate.security.AuthUser;
import com.realestate.sustainable_realestate.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final TransactionRepository repo;
    private final PropertyRepository propertyRepository;
    private final ClientRepository clientRepository;
    private final CurrentUser currentUser;

    public TransactionService(TransactionRepository repo, PropertyRepository propertyRepository,
                              ClientRepository clientRepository, CurrentUser currentUser) {
        this.repo = repo;
        this.propertyRepository = propertyRepository;
        this.clientRepository = clientRepository;
        this.currentUser = currentUser;
    }

    /** Clients only see their own deals. */
    public List<Transaction> getAllTransactions() {
        AuthUser user = currentUser.get();
        if (user != null && user.isClient()) {
            return repo.findByClientId(user.getClientId());
        }
        return repo.findAll();
    }

    /**
     * Records a deal. The database triggers then block it if the property isn't sustainable
     * or already sold, and mark the property Unavailable when it goes through.
     */
    @Transactional
    public Transaction create(Transaction t) {
        Validation.positiveId(t.getTransactionId(), "Transaction ID");
        if (repo.existsById(t.getTransactionId())) {
            throw ApiException.conflict("Transaction ID " + t.getTransactionId() + " is already in use.");
        }
        Property property = validate(t);
        if (!"Available".equalsIgnoreCase(property.getAvailabilityStatus())) {
            throw ApiException.conflict("This property is already sold or let.");
        }
        Transaction saved = repo.saveAndFlush(t);
        log.info("Transaction {} recorded on property {}", t.getTransactionId(), t.getPropertyId());
        return saved;
    }

    @Transactional
    public Transaction update(int id, Transaction t) {
        Transaction existing = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Transaction " + id + " not found."));
        if (t.getPropertyId() != existing.getPropertyId()) {
            throw ApiException.badRequest("A transaction can't be moved to another property. Delete it and record a new one.");
        }
        t.setTransactionId(id);
        validate(t);
        return repo.save(t);
    }

    /** Admin console form: "Add" doubles as update when the ID exists. */
    @Transactional
    public void saveFromForm(Transaction t) {
        if (t.getDate() == null) {
            t.setDate(LocalDate.now());
        }
        if (repo.existsById(t.getTransactionId())) {
            update(t.getTransactionId(), t);
        } else {
            create(t);
        }
    }

    /** Checks the input and that the caller may deal on this property. */
    private Property validate(Transaction t) {
        if (!(t.getAmount() > 0)) {
            throw ApiException.badRequest("Amount must be greater than zero.");
        }
        if (t.getDate() == null) {
            throw ApiException.badRequest("Date is required.");
        }
        if (t.getDate().isAfter(LocalDate.now())) {
            throw ApiException.badRequest("The date can't be in the future.");
        }
        Property property = propertyRepository.findById(t.getPropertyId())
                .orElseThrow(() -> ApiException.badRequest("Property " + t.getPropertyId() + " doesn't exist."));
        if (!clientRepository.existsById(t.getClientId())) {
            throw ApiException.badRequest("Client " + t.getClientId() + " doesn't exist.");
        }
        currentUser.requireListingAccess(property.getAgentId());
        return property;
    }

    /** Admin only. The trg_after_transaction_delete trigger relists the property. */
    @Transactional
    public void deleteTransaction(int id) {
        currentUser.requireAdmin();
        if (!repo.existsById(id)) {
            throw ApiException.notFound("Transaction " + id + " not found.");
        }
        repo.deleteById(id);
        log.info("Transaction {} deleted", id);
    }
}
