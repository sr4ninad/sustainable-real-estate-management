package com.realestate.sustainable_realestate;

import com.realestate.sustainable_realestate.adapter.PropertyAdapter;
import com.realestate.sustainable_realestate.config.ConfigManager;
import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.factory.ClientFactory;
import com.realestate.sustainable_realestate.factory.PropertyFactory;
import com.realestate.sustainable_realestate.model.BuyerClient;
import com.realestate.sustainable_realestate.model.Property;
import com.realestate.sustainable_realestate.model.RenterClient;
import com.realestate.sustainable_realestate.model.SellerClient;
import com.realestate.sustainable_realestate.strategy.BuyerStrategy;
import com.realestate.sustainable_realestate.strategy.PricingStrategy;
import com.realestate.sustainable_realestate.strategy.RenterStrategy;
import com.realestate.sustainable_realestate.strategy.SellerStrategy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/** Singleton, Strategy, Factory and Adapter behaviour. */
class PatternTests {

    @Test
    void configManagerIsASingletonWithSharedRates() {
        assertThat(ConfigManager.getInstance()).isSameAs(ConfigManager.getInstance());
        assertThat(ConfigManager.getInstance().getRate(ConfigManager.TAX_RATE)).isEqualTo(0.001);
        assertThat(ConfigManager.getInstance().getRate(ConfigManager.COMMISSION_RATE)).isEqualTo(0.03);
    }

    @Test
    void buyerGetsStandardAndPromotionalDiscount() {
        assertThat(new BuyerStrategy().calculate(1_000_000)).isCloseTo(855_000, within(0.01));
    }

    @Test
    void sellerGetsMarkupWithoutTheBuyerDiscount() {
        assertThat(new SellerStrategy().calculate(1_000_000)).isCloseTo(1_100_000, within(0.01));
    }

    @Test
    void renterPaysTwoPercentPerMonth() {
        assertThat(new RenterStrategy().calculate(1_000_000)).isCloseTo(20_000, within(0.01));
    }

    @Test
    void strategyIsChosenByClientTypeAndUnknownTypesAreRejected() {
        assertThat(PricingStrategy.forClientType("Buyer")).isInstanceOf(BuyerStrategy.class);
        assertThat(PricingStrategy.forClientType("seller")).isInstanceOf(SellerStrategy.class);
        assertThat(PricingStrategy.forClientType(" RENTER ")).isInstanceOf(RenterStrategy.class);
        assertThatThrownBy(() -> PricingStrategy.forClientType("landlord")).isInstanceOf(ApiException.class);
    }

    @Test
    void clientFactoryCreatesTypedClientsAndNormalisesTheDatabaseValue() {
        assertThat(ClientFactory.createClient("BUYER")).isInstanceOf(BuyerClient.class);
        assertThat(ClientFactory.createClient("seller")).isInstanceOf(SellerClient.class);
        assertThat(ClientFactory.createClient("Renter")).isInstanceOf(RenterClient.class);
        assertThat(ClientFactory.databaseType(ClientFactory.createClient("renter"))).isEqualTo("Renter");
        assertThatThrownBy(() -> ClientFactory.createClient("tenant")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> ClientFactory.createClient(null)).isInstanceOf(ApiException.class);
    }

    @Test
    void propertyFactorySetsDefaultsPerCategory() {
        Property villa = PropertyFactory.createProperty("Villa");
        assertThat(villa.getType()).isEqualTo("Villa");
        assertThat(villa.getEnergyEfficiency()).isEqualTo("B");
        assertThat(villa.getAvailabilityStatus()).isEqualTo("Available");

        assertThat(PropertyFactory.createProperty("office").getEnergyEfficiency()).isEqualTo("C");
        assertThat(PropertyFactory.createProperty(null).getType()).isEqualTo("General");
    }

    @Test
    void adapterReadsTheStoredProcedureColumnsInOrder() {
        Object[] row = { 201, "Prestige Lakeside, Bengaluru", new BigDecimal("9500000.00"), 2L };
        Property p = PropertyAdapter.adapt(row);
        assertThat(p.getPropertyId()).isEqualTo(201);
        assertThat(p.getAddress()).isEqualTo("Prestige Lakeside, Bengaluru");
        assertThat(p.getPrice()).isEqualTo(9_500_000.0);
        assertThat(PropertyAdapter.featureCount(row)).isEqualTo(2);
    }
}
