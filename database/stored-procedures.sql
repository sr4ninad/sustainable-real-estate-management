USE sustainable_real_estate;

DROP PROCEDURE IF EXISTS calculate_agent_commission;
DROP PROCEDURE IF EXISTS get_properties_by_sustainability;
DROP PROCEDURE IF EXISTS get_properties_by_efficiency;
DROP PROCEDURE IF EXISTS get_clients_with_transactions;

DELIMITER $$

-- Closed deals for one agent and their 3% commission on the transaction amounts
-- (same rate as ConfigManager.COMMISSION_RATE).
CREATE PROCEDURE calculate_agent_commission(IN input_agent_id INT)
BEGIN
    SELECT a.Agent_ID, a.Name,
           COUNT(t.Transaction_ID) AS Total_Sales,
           COALESCE(SUM(t.Amount), 0) AS Total_Sales_Value,
           COALESCE(SUM(t.Amount), 0) * 0.03 AS Total_Commission
    FROM Agent a
    LEFT JOIN Property p ON a.Agent_ID = p.Agent_ID
    LEFT JOIN Transaction t ON p.Property_ID = t.Property_ID
    WHERE a.Agent_ID = input_agent_id
    GROUP BY a.Agent_ID, a.Name;
END$$

-- Properties with at least min_features green features (a property without a
-- sustainability record counts as 0).
CREATE PROCEDURE get_properties_by_sustainability(IN min_features INT)
BEGIN
    SELECT p.Property_ID, p.Address, p.Price,
           (CASE WHEN sf.Solar_Panels = 'Yes' THEN 1 ELSE 0 END +
            CASE WHEN sf.Rainwater_Harvesting = 'Yes' THEN 1 ELSE 0 END +
            CASE WHEN sf.Waste_Management = 'Yes' THEN 1 ELSE 0 END) AS Feature_Count
    FROM Property p
    LEFT JOIN Sustainability_Features sf ON p.Property_ID = sf.Property_ID
    HAVING Feature_Count >= min_features
    ORDER BY Feature_Count DESC, p.Property_ID;
END$$

CREATE PROCEDURE get_properties_by_efficiency()
BEGIN
    SELECT Energy_Efficiency, COUNT(*) AS Count
    FROM Property
    GROUP BY Energy_Efficiency
    ORDER BY Energy_Efficiency;
END$$

CREATE PROCEDURE get_clients_with_transactions()
BEGIN
    SELECT Client_ID, Name
    FROM Client
    WHERE Client_ID IN (SELECT Client_ID FROM Transaction)
    ORDER BY Name;
END$$

DELIMITER ;
