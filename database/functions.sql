USE sustainable_real_estate;

DROP FUNCTION IF EXISTS calculate_price_per_sqft;
DROP FUNCTION IF EXISTS calculate_property_tax;

DELIMITER $$

-- Price per square foot (0 when size is unknown).
CREATE FUNCTION calculate_price_per_sqft(input_property_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    -- v_ prefix: a local variable named like a column would shadow the column.
    DECLARE v_price DECIMAL(15,2);
    DECLARE v_size INT;

    SELECT Price, Size INTO v_price, v_size
    FROM Property
    WHERE Property_ID = input_property_id;

    RETURN IF(v_size > 0, v_price / v_size, 0);
END$$

-- Annual property tax: 0.1% of price (same rate as ConfigManager.TAX_RATE).
CREATE FUNCTION calculate_property_tax(input_property_id INT)
RETURNS DECIMAL(15,2)
READS SQL DATA
BEGIN
    DECLARE v_price DECIMAL(15,2);

    SELECT Price INTO v_price
    FROM Property
    WHERE Property_ID = input_property_id;

    RETURN COALESCE(v_price, 0) * 0.001;
END$$

DELIMITER ;
