-- Upgrades an EXISTING sustainable_real_estate database in place (keeps your data).
-- From the project root:
--   mysql -u root -p < database/upgrade.sql
USE sustainable_real_estate;

-- 1. client_category column (older databases only got it from Hibernate's ddl-auto=update).
DROP PROCEDURE IF EXISTS upgrade_add_client_category;
DELIMITER $$
CREATE PROCEDURE upgrade_add_client_category()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Client' AND COLUMN_NAME = 'client_category') THEN
        ALTER TABLE Client ADD COLUMN client_category VARCHAR(20);
    END IF;
    UPDATE Client SET client_category = LOWER(Type) WHERE client_category IS NULL;
END$$
DELIMITER ;
CALL upgrade_add_client_category();
DROP PROCEDURE upgrade_add_client_category;

-- 2. Login accounts.
CREATE TABLE IF NOT EXISTS App_User (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(40) NOT NULL UNIQUE,
    Password_Hash VARCHAR(100) NOT NULL,
    Role ENUM('ADMIN','AGENT','CLIENT') NOT NULL,
    Agent_ID INT NULL UNIQUE,
    Client_ID INT NULL UNIQUE,
    Enabled BOOLEAN NOT NULL DEFAULT TRUE,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Last_Login DATETIME NULL,
    FOREIGN KEY (Agent_ID) REFERENCES Agent(Agent_ID),
    FOREIGN KEY (Client_ID) REFERENCES Client(Client_ID)
);

-- 3. Fixed functions, procedures and triggers (all scripts are safe to re-run).
SOURCE database/functions.sql;
SOURCE database/stored-procedures.sql;
SOURCE database/triggers.sql;

-- 4. One sustainability record per property. Fails if a property has duplicates;
--    remove the extra rows first in that case.
DROP PROCEDURE IF EXISTS upgrade_add_features_unique;
DELIMITER $$
CREATE PROCEDURE upgrade_add_features_unique()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sustainability_Features'
                     AND INDEX_NAME = 'uq_features_property') THEN
        ALTER TABLE Sustainability_Features ADD UNIQUE KEY uq_features_property (Property_ID);
    END IF;
END$$
DELIMITER ;
CALL upgrade_add_features_unique();
DROP PROCEDURE upgrade_add_features_unique;
