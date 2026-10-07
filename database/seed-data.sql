-- Demo data. Run after schema, functions, procedures and triggers:
-- the triggers mark sold properties Unavailable and record the price changes below.
-- Login accounts are created by the backend on first start (admin, agent<id>, client<id>).
USE sustainable_real_estate;

INSERT INTO Agent VALUES
(1, 'Arjun Kapoor',       '9876543210', 'arjun.kapoor@verdant-estates.in'),
(2, 'Kavya Menon',        '9845012345', 'kavya.menon@verdant-estates.in'),
(3, 'Rahul Verma',        '9810098765', 'rahul.verma@verdant-estates.in'),
(4, 'Neha Deshpande',     '9822334455', 'neha.deshpande@verdant-estates.in'),
(5, 'Siddharth Rao',      '9900112233', 'siddharth.rao@verdant-estates.in');

INSERT INTO Client VALUES
(101, 'Aarav Sharma',     '9988776655', 'aarav.sharma@gmail.com',   'Buyer',  'buyer'),
(102, 'Priya Nair',       '9877665544', 'priya.nair@gmail.com',     'Seller', 'seller'),
(103, 'Rohan Mehta',      '9766554433', 'rohan.mehta@outlook.com',  'Buyer',  'buyer'),
(104, 'Ananya Iyer',      '9655443322', 'ananya.iyer@gmail.com',    'Buyer',  'buyer'),
(105, 'Vikram Reddy',     '9544332211', 'vikram.reddy@yahoo.com',   'Seller', 'seller'),
(106, 'Sneha Kulkarni',   '9433221100', 'sneha.kulkarni@gmail.com', 'Renter', 'renter'),
(107, 'Kabir Singh',      '9322110099', 'kabir.singh@gmail.com',    'Buyer',  'buyer'),
(108, 'Meera Joshi',      '9211009988', 'meera.joshi@outlook.com',  'Renter', 'renter');

INSERT INTO Property VALUES
(201, 'Prestige Lakeside, Whitefield, Bengaluru',   'Apartment',  1450,  9500000, 'A',  'IGBC',  'Available', 1),
(202, 'Palm Grove Villa, Koramangala, Bengaluru',   'Villa',      3200, 28500000, 'A+', 'GRIHA', 'Available', 1),
(203, 'Hiranandani Towers, Powai, Mumbai',          'Apartment',  1100, 20000000, 'B',  'None',  'Available', 2),
(204, 'Cyber Hub Offices, DLF Phase 2, Gurugram',   'Commercial', 6500, 72000000, 'A',  'LEED',  'Available', 3),
(205, 'Sea Breeze Residency, Bandra West, Mumbai',  'Apartment',  1600, 42000000, 'A+', 'GRIHA', 'Available', 2),
(206, 'Green Acres, Baner, Pune',                   'Villa',      2800, 15500000, 'B',  'None',  'Available', 4),
(207, 'Tech Park Plaza, HITEC City, Hyderabad',     'Office',     9000, 95000000, 'A',  'LEED',  'Available', 5),
(208, 'Heritage Flats, Mylapore, Chennai',          'Apartment',   950,  7800000, 'C',  'None',  'Available', 4);

INSERT INTO Sustainability_Features VALUES
(401, 201, 'Yes', 'Yes', 'No'),
(402, 202, 'Yes', 'Yes', 'Yes'),
(403, 203, 'No',  'Yes', 'Yes'),
(404, 204, 'Yes', 'Yes', 'Yes'),
(405, 205, 'Yes', 'No',  'No'),
(406, 206, 'No',  'No',  'No'),   -- not sustainable: sales are blocked by the trigger
(407, 207, 'Yes', 'Yes', 'No'),
(408, 208, 'No',  'No',  'Yes');

-- Price changes (recorded by trg_property_update_log), back-dated for a realistic history.
UPDATE Property SET Price = 21000000 WHERE Property_ID = 203;
UPDATE Property SET Price = 27500000 WHERE Property_ID = 202;
UPDATE Property SET Price = 16500000 WHERE Property_ID = 206;
UPDATE Property SET Price =  7400000 WHERE Property_ID = 208;
UPDATE Property_Update_Log SET Updated_At = '2025-10-04 11:20:00' WHERE Property_ID = 203;
UPDATE Property_Update_Log SET Updated_At = '2026-02-14 16:05:00' WHERE Property_ID = 202;
UPDATE Property_Update_Log SET Updated_At = '2026-04-22 10:45:00' WHERE Property_ID = 206;
UPDATE Property_Update_Log SET Updated_At = '2026-08-09 15:30:00' WHERE Property_ID = 208;

-- Closed deals (trg_check_sustainability approves them; the property becomes Unavailable).
INSERT INTO Transaction VALUES
(301, '2025-11-12',  9300000, 201, 101),
(302, '2026-01-20', 20500000, 203, 103),
(303, '2026-03-05', 71000000, 204, 104),
(304, '2026-05-18', 41500000, 205, 107),
(305, '2026-07-02',  1710000, 207, 106);
