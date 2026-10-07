USE sustainable_real_estate;

DROP TRIGGER IF EXISTS trg_property_update_log;
DROP TRIGGER IF EXISTS trg_check_sustainability;
DROP TRIGGER IF EXISTS trg_after_transaction_insert;
DROP TRIGGER IF EXISTS trg_after_transaction_delete;

DELIMITER $$

-- Log price changes only (status-only updates are not price history).
CREATE TRIGGER trg_property_update_log
AFTER UPDATE ON Property
FOR EACH ROW
BEGIN
    IF NOT (OLD.Price <=> NEW.Price) THEN
        INSERT INTO Property_Update_Log(Property_ID, Old_Price, New_Price)
        VALUES (NEW.Property_ID, OLD.Price, NEW.Price);
    END IF;
END$$

-- Block a sale when the property is already sold/let, or has no green features.
-- A property without a Sustainability_Features record counts as having none.
CREATE TRIGGER trg_check_sustainability
BEFORE INSERT ON Transaction
FOR EACH ROW
BEGIN
    DECLARE current_status VARCHAR(20);
    DECLARE green_features INT DEFAULT 0;

    SELECT Availability_Status INTO current_status
    FROM Property
    WHERE Property_ID = NEW.Property_ID;

    IF current_status = 'Unavailable' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction blocked: Property is already sold or let.';
    END IF;

    SELECT COALESCE(MAX(
               (Solar_Panels = 'Yes') + (Rainwater_Harvesting = 'Yes') + (Waste_Management = 'Yes')
           ), 0)
    INTO green_features
    FROM Sustainability_Features
    WHERE Property_ID = NEW.Property_ID;

    IF green_features = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction blocked: Property not sustainable enough.';
    END IF;
END$$

-- Mark the property sold/let once a deal goes through.
CREATE TRIGGER trg_after_transaction_insert
AFTER INSERT ON Transaction
FOR EACH ROW
BEGIN
    UPDATE Property
    SET Availability_Status = 'Unavailable'
    WHERE Property_ID = NEW.Property_ID;
END$$

-- Relist the property when its (last) transaction is deleted.
CREATE TRIGGER trg_after_transaction_delete
AFTER DELETE ON Transaction
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Transaction WHERE Property_ID = OLD.Property_ID) THEN
        UPDATE Property
        SET Availability_Status = 'Available'
        WHERE Property_ID = OLD.Property_ID;
    END IF;
END$$

DELIMITER ;
