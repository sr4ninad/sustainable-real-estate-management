package com.realestate.sustainable_realestate.strategy;

import com.realestate.sustainable_realestate.config.ConfigManager;

public class BuyerStrategy implements PricingStrategy {

    @Override
    public double calculate(double price) {
        ConfigManager config = ConfigManager.getInstance();
        double discounted = price * (1 - config.getRate(ConfigManager.BUYER_DISCOUNT)); // standard 5% off
        return discounted * (1 - config.getRate(ConfigManager.PROMO_DISCOUNT));        // then 10% promotion
    }
}
