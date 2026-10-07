package com.realestate.sustainable_realestate.strategy;

import com.realestate.sustainable_realestate.config.ConfigManager;

public class RenterStrategy implements PricingStrategy {

    @Override
    public double calculate(double price) {
        return price * ConfigManager.getInstance().getRate(ConfigManager.MONTHLY_RENT_RATE); // monthly rent (2%)
    }
}
