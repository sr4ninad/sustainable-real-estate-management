-- Tests for the triggers, functions and stored procedures.
-- Everything runs inside a transaction that is rolled back, so no data is changed.
-- From the project root:
--   mysql -u root -p < database/tests/trigger-tests.sql
-- Every row of the result should say PASS.
USE sustainable_real_estate;

DROP PROCEDURE IF EXISTS run_trigger_tests;

DELIMITER $$
CREATE PROCEDURE run_trigger_tests()
BEGIN
    DECLARE blocked INT DEFAULT 0;
    DECLARE blocked_msg VARCHAR(255) DEFAULT NULL;
    DECLARE n INT;
    DECLARE v DECIMAL(15,2);
    DECLARE s VARCHAR(20);
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
        GET DIAGNOSTICS CONDITION 1 blocked_msg = MESSAGE_TEXT;
        SET blocked = 1;
    END;

    -- MEMORY tables are not transactional, so results survive the ROLLBACK.
    DROP TEMPORARY TABLE IF EXISTS test_results;
    CREATE TEMPORARY TABLE test_results (id INT AUTO_INCREMENT PRIMARY KEY, test VARCHAR(120), result VARCHAR(4), detail VARCHAR(255)) ENGINE = MEMORY;

    START TRANSACTION;

    -- Fixtures (IDs far away from real data)
    INSERT INTO Agent VALUES (9901, 'Test Agent', '9000000000', 'test@example.com');
    INSERT INTO Client VALUES (99901, 'Test Client', '9000000001', 'client@example.com', 'Buyer', 'buyer');
    INSERT INTO Property VALUES (99001, 'Green Test House', 'Villa', 2000, 1000000, 'A', 'LEED', 'Available', 9901);
    INSERT INTO Property VALUES (99002, 'Grey Test House', 'Villa', 1000, 500000, 'C', 'None', 'Available', 9901);
    INSERT INTO Property VALUES (99003, 'No-Record House', 'Villa', 1000, 500000, 'C', 'None', 'Available', 9901);
    INSERT INTO Sustainability_Features VALUES (99401, 99001, 'Yes', 'No', 'No');
    INSERT INTO Sustainability_Features VALUES (99402, 99002, 'No', 'No', 'No');

    -- 1. Property with no green features is blocked
    SET blocked = 0;
    INSERT INTO Transaction VALUES (99301, CURDATE(), 500000, 99002, 99901);
    INSERT INTO test_results (test, result, detail)
    VALUES ('Sale of a property with 0 features is blocked', IF(blocked = 1, 'PASS', 'FAIL'), blocked_msg);

    -- 2. Property without any sustainability record is blocked
    SET blocked = 0;
    INSERT INTO Transaction VALUES (99302, CURDATE(), 500000, 99003, 99901);
    INSERT INTO test_results (test, result, detail)
    VALUES ('Sale of a property with no features record is blocked', IF(blocked = 1, 'PASS', 'FAIL'), blocked_msg);

    -- 3. Green property sells and becomes Unavailable
    SET blocked = 0;
    INSERT INTO Transaction VALUES (99303, CURDATE(), 1000000, 99001, 99901);
    SELECT Availability_Status INTO s FROM Property WHERE Property_ID = 99001;
    INSERT INTO test_results (test, result, detail)
    VALUES ('Sale of a green property succeeds and marks it Unavailable', IF(blocked = 0 AND s = 'Unavailable', 'PASS', 'FAIL'), s);

    -- 4. Selling it again is blocked
    SET blocked = 0;
    INSERT INTO Transaction VALUES (99304, CURDATE(), 1000000, 99001, 99901);
    INSERT INTO test_results (test, result, detail)
    VALUES ('Second sale of a sold property is blocked', IF(blocked = 1, 'PASS', 'FAIL'), blocked_msg);

    -- 5. Status change alone is not logged as a price change
    SELECT COUNT(*) INTO n FROM Property_Update_Log WHERE Property_ID = 99001;
    INSERT INTO test_results (test, result, detail)
    VALUES ('Status-only update is not logged', IF(n = 0, 'PASS', 'FAIL'), CONCAT(n, ' log rows'));

    -- 6. Price change is logged
    UPDATE Property SET Price = 1100000 WHERE Property_ID = 99001;
    SELECT COUNT(*) INTO n FROM Property_Update_Log WHERE Property_ID = 99001 AND Old_Price = 1000000 AND New_Price = 1100000;
    INSERT INTO test_results (test, result, detail)
    VALUES ('Price update is logged with old and new price', IF(n = 1, 'PASS', 'FAIL'), CONCAT(n, ' log rows'));

    -- 7. Deleting the sale relists the property
    DELETE FROM Transaction WHERE Transaction_ID = 99303;
    SELECT Availability_Status INTO s FROM Property WHERE Property_ID = 99001;
    INSERT INTO test_results (test, result, detail)
    VALUES ('Deleting the transaction relists the property', IF(s = 'Available', 'PASS', 'FAIL'), s);

    -- 8. Functions
    SELECT calculate_price_per_sqft(99001) INTO v;
    INSERT INTO test_results (test, result, detail)
    VALUES ('calculate_price_per_sqft = price / size', IF(v = 550.00, 'PASS', 'FAIL'), v);
    SELECT calculate_property_tax(99001) INTO v;
    INSERT INTO test_results (test, result, detail)
    VALUES ('calculate_property_tax = 0.1% of price', IF(v = 1100.00, 'PASS', 'FAIL'), v);
    SELECT calculate_property_tax(-1) INTO v;
    INSERT INTO test_results (test, result, detail)
    VALUES ('calculate_property_tax of a missing property is 0', IF(v = 0, 'PASS', 'FAIL'), v);

    -- 9. Commission uses transaction amounts (sell again, then check)
    SET blocked = 0;
    INSERT INTO Transaction VALUES (99305, CURDATE(), 1200000, 99001, 99901);
    DROP TEMPORARY TABLE IF EXISTS commission;
    CREATE TEMPORARY TABLE commission (agent INT, name VARCHAR(100), sales INT, total DECIMAL(15,2), commission DECIMAL(15,2));
    INSERT INTO commission
    SELECT a.Agent_ID, a.Name, COUNT(t.Transaction_ID), COALESCE(SUM(t.Amount), 0), COALESCE(SUM(t.Amount), 0) * 0.03
    FROM Agent a LEFT JOIN Property p ON a.Agent_ID = p.Agent_ID LEFT JOIN Transaction t ON p.Property_ID = t.Property_ID
    WHERE a.Agent_ID = 9901 GROUP BY a.Agent_ID, a.Name;
    SELECT commission INTO v FROM commission;
    INSERT INTO test_results (test, result, detail)
    VALUES ('Commission is 3% of closed transaction amounts', IF(v = 36000.00, 'PASS', 'FAIL'), v);
    DROP TEMPORARY TABLE commission;

    ROLLBACK;

    SELECT test, result, detail FROM test_results ORDER BY id;
    DROP TEMPORARY TABLE test_results;
END$$
DELIMITER ;

CALL run_trigger_tests();
DROP PROCEDURE run_trigger_tests;
