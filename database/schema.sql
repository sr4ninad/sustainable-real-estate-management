-- Creates the database from scratch (drops any existing copy).
-- For an existing database, run upgrade.sql instead.
DROP DATABASE IF EXISTS sustainable_real_estate;
CREATE DATABASE sustainable_real_estate;
USE sustainable_real_estate;

CREATE TABLE Agent (
    Agent_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Contact_No VARCHAR(15),
    Email VARCHAR(100)
);

CREATE TABLE Client (
    Client_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Contact_No VARCHAR(15),
    Email VARCHAR(100),
    Type ENUM('Buyer','Seller','Renter') NOT NULL,
    client_category VARCHAR(20)
);

CREATE TABLE Property (
    Property_ID INT PRIMARY KEY,
    Address VARCHAR(255) NOT NULL,
    Type VARCHAR(50),
    Size INT,
    Price DECIMAL(15,2),
    Energy_Efficiency VARCHAR(10),
    Green_Certification VARCHAR(50),
    Availability_Status ENUM('Available','Unavailable') DEFAULT 'Available',
    Agent_ID INT,
    FOREIGN KEY (Agent_ID) REFERENCES Agent(Agent_ID)
);

CREATE TABLE Sustainability_Features (
    Feature_ID INT PRIMARY KEY,
    Property_ID INT,
    Solar_Panels ENUM('Yes','No'),
    Rainwater_Harvesting ENUM('Yes','No'),
    Waste_Management ENUM('Yes','No'),
    UNIQUE KEY uq_features_property (Property_ID),
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID)
);

CREATE TABLE Transaction (
    Transaction_ID INT PRIMARY KEY,
    Date DATE,
    Amount DECIMAL(15,2),
    Property_ID INT,
    Client_ID INT,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID),
    FOREIGN KEY (Client_ID) REFERENCES Client(Client_ID)
);

CREATE TABLE Property_Update_Log (
    Log_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT,
    Old_Price DECIMAL(15,2),
    New_Price DECIMAL(15,2),
    Updated_At DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Login accounts. AGENT / CLIENT accounts point at their Agent / Client record.
CREATE TABLE App_User (
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
