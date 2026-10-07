package com.realestate.sustainable_realestate.strategy;

import com.realestate.sustainable_realestate.exception.ApiException;

public interface PricingStrategy {

    double calculate(double price);

    /** Picks the strategy for a client type: buyer, seller or renter. */
    static PricingStrategy forClientType(String type) {
        String key = type == null ? "" : type.trim().toLowerCase();
        return switch (key) {
            case "buyer" -> new BuyerStrategy();
            case "seller" -> new SellerStrategy();
            case "renter" -> new RenterStrategy();
            default -> throw ApiException.badRequest("Unknown client type \"" + type + "\". Use buyer, seller or renter.");
        };
    }
}
