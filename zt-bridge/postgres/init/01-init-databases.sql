-- =============================================================================
-- ZT Bridge VM - PostgreSQL Initialization Script
-- =============================================================================
-- Creates required databases and users for Guacamole and Zero-UI
-- =============================================================================

-- Create database for Guacamole
CREATE DATABASE guacamole;

-- Create database for Zero-UI
CREATE DATABASE zero_ui;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE guacamole TO ztbridge;
GRANT ALL PRIVILEGES ON DATABASE zero_ui TO ztbridge;

-- Connect to guacamole database and create schema
\connect guacamole

-- Guacamole schema will be initialized by the Guacamole container
-- using the initdb.sh script, but we create placeholder tables here

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ztbridge;

-- Connect to zero_ui database
\connect zero_ui

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ztbridge;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END $$;
