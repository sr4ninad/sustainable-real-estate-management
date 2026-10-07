package com.realestate.sustainable_realestate.adapter;

import com.realestate.sustainable_realestate.model.Property;

/**
 * Adapts a raw row from get_properties_by_sustainability(min)
 * — [Property_ID, Address, Price, Feature_Count] — into a Property.
 */
public class PropertyAdapter {

    public static final int ID = 0;
    public static final int ADDRESS = 1;
    public static final int PRICE = 2;
    public static final int FEATURE_COUNT = 3;

    public static Property adapt(Object[] data) {

        Property p = new Property();

        if (data[ID] != null) {
            p.setPropertyId(((Number) data[ID]).intValue());
        }

        if (data[ADDRESS] != null) {
            p.setAddress(data[ADDRESS].toString());
        }

        if (data[PRICE] != null) {
            p.setPrice(((Number) data[PRICE]).doubleValue());
        }

        return p;
    }

    public static int featureCount(Object[] data) {
        return data.length > FEATURE_COUNT && data[FEATURE_COUNT] != null
                ? ((Number) data[FEATURE_COUNT]).intValue()
                : 0;
    }
}
