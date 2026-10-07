package com.realestate.sustainable_realestate.factory;

import com.realestate.sustainable_realestate.exception.ApiException;
import com.realestate.sustainable_realestate.model.*;

public class ClientFactory {

    /**
     * Creates the right Client subtype for a type name ("buyer", "Seller", ...).
     * Rejects unknown types instead of silently creating an untyped client.
     */
    public static Client createClient(String type) {
        String key = type == null ? "" : type.trim().toLowerCase();

        return switch (key) {
            case "buyer" -> new BuyerClient();
            case "renter" -> new RenterClient();
            case "seller" -> new SellerClient();
            default -> throw ApiException.badRequest("Client type must be Buyer, Seller or Renter.");
        };
    }

    /** The value stored in the Client.Type column: ENUM('Buyer','Seller','Renter'). */
    public static String databaseType(Client typed) {
        String t = typed.getType();
        return Character.toUpperCase(t.charAt(0)) + t.substring(1).toLowerCase();
    }
}
