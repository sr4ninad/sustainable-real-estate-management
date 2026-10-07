package com.realestate.sustainable_realestate.service;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.repository.AgentRepository;
import com.realestate.sustainable_realestate.repository.PropertyRepository;
import com.realestate.sustainable_realestate.repository.SustainabilityRepository;
import com.realestate.sustainable_realestate.repository.TransactionRepository;
import com.realestate.sustainable_realestate.security.AppUser;
import com.realestate.sustainable_realestate.security.AuthUser;
import com.realestate.sustainable_realestate.security.CurrentUser;
import com.realestate.sustainable_realestate.security.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Validation and ownership rules, with the repositories mocked. */
class PropertyServiceTest {

    private PropertyRepository properties;
    private TransactionRepository transactions;
    private AgentRepository agents;
    private SustainabilityRepository features;
    private PropertyService service;

    @BeforeEach
    void setUp() {
        properties = mock(PropertyRepository.class);
        transactions = mock(TransactionRepository.class);
        agents = mock(AgentRepository.class);
        features = mock(SustainabilityRepository.class);
        CurrentUser currentUser = new CurrentUser();
        SustainabilityService sustainability = new SustainabilityService(features, properties, currentUser);
        service = new PropertyService(properties, features, transactions, agents, sustainability, currentUser);

        when(agents.existsById(any())).thenReturn(true);
        when(properties.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signIn(Role role, Integer agentId, Integer clientId) {
        AppUser u = new AppUser();
        u.setUserId(1);
        u.setUsername(role.name().toLowerCase());
        u.setPasswordHash("x");
        u.setRole(role);
        u.setAgentId(agentId);
        u.setClientId(clientId);
        AuthUser principal = new AuthUser(u);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static Property property(int id, Integer agentId, double price) {
        Property p = new Property();
        p.setPropertyId(id);
        p.setAddress("12 MG Road, Bengaluru");
        p.setType("Apartment");
        p.setPrice(price);
        p.setAgentId(agentId);
        return p;
    }

    private static HttpStatus statusOf(Throwable t) {
        return ((ApiException) t).getStatus();
    }

    @Test
    void agentCreatesListingsUnderTheirOwnName() {
        signIn(Role.AGENT, 2, null);
        Property saved = service.create(property(300, 5, 1_000_000));
        assertThat(saved.getAgentId()).isEqualTo(2);
        assertThat(saved.getEnergyEfficiency()).isEqualTo("B"); // factory default kept when none given
    }

    @Test
    void creatingWithAnExistingIdIsAConflictNotAnOverwrite() {
        signIn(Role.ADMIN, null, null);
        when(properties.existsById(201)).thenReturn(true);
        assertThatThrownBy(() -> service.create(property(201, 1, 1_000_000)))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.CONFLICT));
        verify(properties, never()).save(any());
    }

    @Test
    void agentCannotEditAnotherAgentsListing() {
        signIn(Role.AGENT, 2, null);
        when(properties.findById(201)).thenReturn(Optional.of(property(201, 1, 1_000_000)));
        assertThatThrownBy(() -> service.update(201, property(201, 1, 2_000_000)))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void clientsCannotCreateListings() {
        signIn(Role.CLIENT, null, 101);
        assertThatThrownBy(() -> service.create(property(300, 1, 1_000_000)))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void invalidInputIsRejectedWithABadRequest() {
        signIn(Role.ADMIN, null, null);
        assertThatThrownBy(() -> service.create(property(300, 1, -5)))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.BAD_REQUEST))
                .hasMessageContaining("Price");

        Property noAddress = property(300, 1, 100);
        noAddress.setAddress("  ");
        assertThatThrownBy(() -> service.create(noAddress)).hasMessageContaining("Address");
    }

    @Test
    void userEnteredRatingsOverrideFactoryDefaults() {
        signIn(Role.ADMIN, null, null);
        Property input = property(300, 1, 1_000_000);
        input.setEnergyEfficiency("a+");
        input.setGreenCertification("LEED");
        Property saved = service.create(input);
        assertThat(saved.getEnergyEfficiency()).isEqualTo("A+");
        assertThat(saved.getGreenCertification()).isEqualTo("LEED");
    }

    @Test
    void propertyWithTransactionsCannotBeDeleted() {
        signIn(Role.ADMIN, null, null);
        when(properties.findById(201)).thenReturn(Optional.of(property(201, 1, 1_000_000)));
        when(transactions.existsByPropertyId(201)).thenReturn(true);
        assertThatThrownBy(() -> service.deleteProperty(201))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.CONFLICT));
        verify(properties, never()).deleteById(any());
    }

    @Test
    void strategyPricingReturnsCopiesAndNeverTouchesStoredEntities() {
        Property stored = property(201, 1, 1_000_000);
        when(properties.findAll()).thenReturn(List.of(stored));
        List<Property> priced = service.getPropertiesWithStrategy("seller");
        assertThat(priced.get(0).getPrice()).isEqualTo(1_100_000.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(stored.getPrice()).isEqualTo(1_000_000.0);
    }
}
