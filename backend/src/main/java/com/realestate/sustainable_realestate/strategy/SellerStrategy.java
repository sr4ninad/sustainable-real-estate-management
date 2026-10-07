package com.realestate.sustainable_realestate.strategy;

import com.realestate.sustainable_realestate.config.ConfigManager;

public class SellerStrategy implements PricingStrategy {

    @Override
    public double calculate(double price) {
        return price * (1 + ConfigManager.getInstance().getRate(ConfigManager.SELLER_MARKUP)); // +10% markup
    }
}
