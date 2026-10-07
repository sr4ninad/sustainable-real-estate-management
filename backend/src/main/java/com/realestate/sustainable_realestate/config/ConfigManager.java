package com.realestate.sustainable_realestate.config;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Singleton holding the business rates used across the app, so each rate is defined once.
 * (The MySQL functions mirror TAX_RATE and COMMISSION_RATE — keep them in sync.)
 */
public final class ConfigManager {

    public static final String CURRENCY = "currency";
    /** Annual property tax as a share of price — matches calculate_property_tax(). */
    public static final String TAX_RATE = "taxRate";
    /** Agent commission on the closed amount — matches calculate_agent_commission(). */
    public static final String COMMISSION_RATE = "commissionRate";
    /** BuyerStrategy: standard buyer discount. */
    public static final String BUYER_DISCOUNT = "buyerDiscount";
    /** BuyerStrategy: extra promotional discount on top of the standard one. */
    public static final String PROMO_DISCOUNT = "discountRate";
    /** SellerStrategy: suggested markup for sellers. */
    public static final String SELLER_MARKUP = "sellerMarkup";
    /** RenterStrategy: monthly rent as a share of price. */
    public static final String MONTHLY_RENT_RATE = "monthlyRentRate";

    // Created eagerly by the JVM's class loader: thread-safe without locking.
    private static final ConfigManager INSTANCE = new ConfigManager();

    private final Map<String, String> config = new ConcurrentHashMap<>();

    private ConfigManager() {
        config.put(CURRENCY, "INR");
        config.put(TAX_RATE, "0.001");
        config.put(COMMISSION_RATE, "0.03");
        config.put(BUYER_DISCOUNT, "0.05");
        config.put(PROMO_DISCOUNT, "0.10");
        config.put(SELLER_MARKUP, "0.10");
        config.put(MONTHLY_RENT_RATE, "0.02");
    }

    public static ConfigManager getInstance() {
        return INSTANCE;
    }

    public String getConfig(String key) {
        return config.get(key);
    }

    public double getRate(String key) {
        return Double.parseDouble(config.get(key));
    }

    public void setConfig(String key, String value) {
        config.put(key, value);
    }
}
