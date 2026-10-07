package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.factory.ClientFactory;
import com.realestate.sustainable_realestate.model.Client;
import com.realestate.sustainable_realestate.repository.ClientRepository;
import com.realestate.sustainable_realestate.repository.TransactionRepository;
import com.realestate.sustainable_realestate.security.AppUserRepository;
import com.realestate.sustainable_realestate.security.AuthUser;
import com.realestate.sustainable_realestate.security.CurrentUser;
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

@Service
public class ClientService {

    private static final Logger log = LoggerFactory.getLogger(ClientService.class);

    private final ClientRepository clientRepository;
    private final TransactionRepository transactionRepository;
    private final AppUserRepository userRepository;
    private final CurrentUser currentUser;

    @PersistenceContext
    private EntityManager entityManager;

    public ClientService(ClientRepository clientRepository, TransactionRepository transactionRepository,
                         AppUserRepository userRepository, CurrentUser currentUser) {
        this.clientRepository = clientRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    /** Admins and agents see everyone; a client only sees their own record. */
    public List<Client> getAllClients() {
        AuthUser user = currentUser.get();
        if (user != null && user.isClient()) {
            return clientRepository.findById(user.getClientId()).map(List::of).orElse(List.of());
        }
        return clientRepository.findAll();
    }

    public Client getClientById(int id) {
        AuthUser user = currentUser.get();
        if (user != null && user.isClient() && !Integer.valueOf(id).equals(user.getClientId())) {
            throw ApiException.forbidden("You can only view your own profile.");
        }
        return clientRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Client " + id + " not found."));
    }

    @Transactional
    public Client create(Client client) {
        currentUser.requireAdminOrAgent();
        Validation.positiveId(client.getClientId(), "Client ID");
        if (clientRepository.existsById(client.getClientId())) {
            throw ApiException.conflict("Client ID " + client.getClientId() + " is already in use.");
        }
        return clientRepository.save(build(client, client.getType()));
    }

    @Transactional
    public Client update(int id, Client client) {
        Client existing = clientRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Client " + id + " not found."));
        AuthUser user = currentUser.require();
        String type = client.getType();
        if (user.isClient()) {
            if (!Integer.valueOf(id).equals(user.getClientId())) {
                throw ApiException.forbidden("You can only edit your own profile.");
            }
            type = existing.getType(); // clients can't change their own type
        }
        client.setClientId(id);
        return clientRepository.save(build(client, type));
    }

    /** Admin console form: "Add / Update" in one form. */
    @Transactional
    public void saveFromForm(Client client) {
        if (client.getClientId() > 0 && clientRepository.existsById(client.getClientId())) {
            update(client.getClientId(), client);
        } else {
            create(client);
        }
    }

    /** Validates input; the factory checks and normalises the client type. */
    private static Client build(Client input, String type) {
        Client typed = ClientFactory.createClient(type);

        Client client = new Client();
        client.setClientId(input.getClientId());
        client.setName(Validation.name(input.getName()));
        client.setEmail(Validation.email(input.getEmail()));
        client.setContactNo(Validation.phone(input.getContactNo()));
        client.setType(ClientFactory.databaseType(typed));
        client.setClientCategory(typed.getType());
        return client;
    }

    @Transactional
    public void deleteClient(int id) {
        currentUser.requireAdmin();
        if (!clientRepository.existsById(id)) {
            throw ApiException.notFound("Client " + id + " not found.");
        }
        if (transactionRepository.existsByClientId(id)) {
            throw ApiException.conflict("This client has transactions on record and can't be deleted.");
        }
        userRepository.findAll().stream()
                .filter(u -> Integer.valueOf(id).equals(u.getClientId()))
                .forEach(userRepository::delete);
        clientRepository.deleteById(id);
        log.info("Client {} deleted", id);
    }

    /** get_clients_with_transactions as named fields. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getClientsWithTransactions() {
        currentUser.requireAdminOrAgent();
        List<Object[]> rows = entityManager.createNativeQuery("CALL get_clients_with_transactions()").getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("clientId", ((Number) row[0]).intValue());
            m.put("name", row[1]);
            result.add(m);
        }
        return result;
    }
}
