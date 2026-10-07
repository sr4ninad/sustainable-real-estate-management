package com.realestate.sustainable_realestate;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end checks against a real MySQL database loaded with database/run-all.sql
 * (seed data + demo logins). Every test is rolled back.
 * Run with: ./mvnw test -Pintegration
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @PersistenceContext
    private EntityManager entityManager;

    private String statusOf(int propertyId) {
        return jdbc.queryForObject("SELECT Availability_Status FROM Property WHERE Property_ID = ?", String.class, propertyId);
    }

    private MockHttpSession login(String username, String password) throws Exception {
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk());
        return session;
    }

    private MockHttpSession admin() throws Exception { return login("admin", "admin123"); }
    private MockHttpSession agent1() throws Exception { return login("agent1", "agent123"); }
    private MockHttpSession client101() throws Exception { return login("client101", "client123"); }

    private static String json(String s) {
        return s.replace('\'', '"');
    }

    // ---------- Authentication ----------

    @Test
    void apiRequiresSignIn() throws Exception {
        mvc.perform(get("/api/properties"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("sign in")));
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'username':'admin','password':'nope'}")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meDescribesTheSignedInUser() throws Exception {
        mvc.perform(get("/api/auth/me").session(agent1()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("AGENT"))
                .andExpect(jsonPath("$.agentId").value(1))
                .andExpect(jsonPath("$.displayName").value("Arjun Kapoor"));
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        MockHttpSession session = admin();
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/properties").session(session)).andExpect(status().isUnauthorized());
    }

    // ---------- Client role ----------

    @Test
    void clientOnlySeesTheirOwnProfileAndDeals() throws Exception {
        MockHttpSession s = client101();
        mvc.perform(get("/api/clients").session(s))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].clientId").value(101));
        mvc.perform(get("/api/transactions").session(s))
                .andExpect(jsonPath("$[*].clientId", everyItem(is(101))));
        mvc.perform(get("/api/clients/102").session(s)).andExpect(status().isForbidden());
    }

    @Test
    void clientCannotChangeListingsOrManageUsers() throws Exception {
        MockHttpSession s = client101();
        mvc.perform(post("/api/properties").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'propertyId':900,'address':'x','price':1}")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users").session(s)).andExpect(status().isForbidden());
    }

    @Test
    void clientCanUpdateOwnContactButNotTheirType() throws Exception {
        mvc.perform(put("/api/clients/101").session(client101()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'name':'Aarav S.','email':'aarav@example.com','contactNo':'9988776655','type':'Seller'}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Aarav S."))
                .andExpect(jsonPath("$.type").value("Buyer"));
    }

    // ---------- Agent role ----------

    @Test
    void agentCannotEditAnotherAgentsListing() throws Exception {
        mvc.perform(put("/api/properties/203").session(agent1()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'address':'Hiranandani Towers','price':1,'agentId':2}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void agentListingsAreAlwaysAssignedToThemselves() throws Exception {
        mvc.perform(post("/api/properties/full").session(agent1()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'propertyId':950,'address':'Test Lane, Pune','type':'Villa','price':5000000,'agentId':3,'solarPanels':true}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentId").value(1));
    }

    @Test
    void agentCannotSellAnotherAgentsProperty() throws Exception {
        mvc.perform(post("/api/transactions").session(agent1()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'transactionId':950,'date':'2026-01-01','amount':100,'propertyId':206,'clientId':101}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void agentsCannotDeleteClientsOrTransactions() throws Exception {
        MockHttpSession s = agent1();
        mvc.perform(delete("/api/clients/108").session(s)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/transactions/301").session(s)).andExpect(status().isForbidden());
    }

    // ---------- Business rules & database triggers ----------

    @Test
    void creatingWithAnExistingIdIsAConflict() throws Exception {
        mvc.perform(post("/api/clients").session(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'clientId':101,'name':'Someone','type':'Buyer'}")))
                .andExpect(status().isConflict());
    }

    @Test
    void validationErrorsAreBadRequests() throws Exception {
        mvc.perform(post("/api/clients").session(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'clientId':960,'name':'','type':'Buyer'}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Name")));
        mvc.perform(post("/api/clients").session(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'clientId':960,'name':'X','type':'Landlord'}")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void triggerBlocksSaleOfUnsustainableProperty() throws Exception {
        mvc.perform(post("/api/transactions").session(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'transactionId':970,'date':'2026-01-01','amount':100,'propertyId':206,'clientId':101}")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(containsString("not sustainable")));
    }

    @Test
    void soldPropertyCannotBeSoldAgain() throws Exception {
        mvc.perform(post("/api/transactions").session(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'transactionId':971,'date':'2026-01-01','amount':100,'propertyId':201,'clientId':103}")))
                .andExpect(status().isConflict());
    }

    @Test
    void saleMarksPropertyUnavailableAndDeletingItRelistsIt() throws Exception {
        MockHttpSession s = admin();
        mvc.perform(post("/api/transactions").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'transactionId':972,'date':'2026-01-01','amount':27000000,'propertyId':202,'clientId':104}")))
                .andExpect(status().isOk());
        // Read straight from the database: the triggers change the row behind Hibernate's cache.
        assertThat(statusOf(202)).isEqualTo("Unavailable");
        mvc.perform(delete("/api/transactions/972").session(s)).andExpect(status().isOk());
        entityManager.flush();
        assertThat(statusOf(202)).isEqualTo("Available");
    }

    @Test
    void mysqlFunctionsAndProceduresReturnRealValues() throws Exception {
        MockHttpSession s = admin();
        mvc.perform(get("/api/functions/price-per-sqft/201").session(s))
                .andExpect(content().string(startsWith("6551.72")));
        mvc.perform(get("/api/functions/property-tax/201").session(s))
                .andExpect(content().string("9500.0"));
        mvc.perform(get("/api/properties/filter/3").session(s))
                .andExpect(jsonPath("$[*].featureCount", everyItem(is(3))))
                .andExpect(jsonPath("$[0].address").isString());
        mvc.perform(get("/api/properties/adapted/2").session(s))
                .andExpect(jsonPath("$[0].address").isString());
        mvc.perform(get("/api/agents/2/commission").session(s))
                .andExpect(jsonPath("$.totalSales").value(2))
                .andExpect(jsonPath("$.totalCommission").value(1860000.0));
        mvc.perform(get("/api/properties/efficiency").session(s))
                .andExpect(jsonPath("$[0].energyEfficiency").exists());
    }

    // ---------- Admin console ----------

    @Test
    void adminConsoleIsAdminOnly() throws Exception {
        mvc.perform(get("/")).andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
        mvc.perform(get("/").session(agent1())).andExpect(status().isForbidden())
                .andExpect(forwardedUrl("/login?denied"));
        mvc.perform(get("/").session(admin())).andExpect(status().isOk())
                .andExpect(content().string(containsString("Prestige Lakeside")));
    }

    @Test
    void adminConsoleFormsNeedACsrfTokenAndReportErrorsOnThePage() throws Exception {
        MockHttpSession s = admin();
        mvc.perform(post("/deleteProperty/201").session(s)).andExpect(status().isForbidden());
        mvc.perform(post("/deleteProperty/201").session(s).with(csrf()).header("Referer", "http://localhost:8080/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/?error=This+property+has+transactions+on+record.+Delete+those+first."));
    }

    @Test
    void adminConsoleUpdateFormWorks() throws Exception {
        mvc.perform(post("/updateProperty").session(admin()).with(csrf())
                        .param("propertyId", "202").param("price", "26000000"))
                .andExpect(redirectedUrl("/"));
        mvc.perform(get("/api/properties/202").session(admin()))
                .andExpect(jsonPath("$.price").value(26000000.0))
                .andExpect(jsonPath("$.address").value("Palm Grove Villa, Koramangala, Bengaluru"));
    }

    // ---------- User management ----------

    @Test
    void adminManagesUsersButCannotRemoveTheLastAdmin() throws Exception {
        MockHttpSession s = admin();
        mvc.perform(get("/api/users").session(s)).andExpect(jsonPath("$[*].username", hasItem("agent1")));
        mvc.perform(post("/api/users").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'username':'agent1','password':'secret1','role':'ADMIN'}")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/users").session(s).contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'username':'auditor','password':'secret1','role':'ADMIN'}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }
}
