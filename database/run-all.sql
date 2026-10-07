-- Fresh install (DROPS and recreates the database). From the project root:
--   mysql -u root -p < database/run-all.sql
-- Existing database you want to keep? Use database/upgrade.sql instead.
SOURCE database/schema.sql;
SOURCE database/functions.sql;
SOURCE database/stored-procedures.sql;
SOURCE database/triggers.sql;
SOURCE database/seed-data.sql;
