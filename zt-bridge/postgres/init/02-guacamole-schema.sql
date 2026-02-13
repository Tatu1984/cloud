-- =============================================================================
-- Apache Guacamole PostgreSQL Schema
-- =============================================================================
-- This schema is based on the official Guacamole PostgreSQL schema
-- Version: 1.5.4
-- =============================================================================

\connect guacamole

--
-- Table of connection groups
--
CREATE TABLE IF NOT EXISTS guacamole_connection_group (
    connection_group_id   SERIAL PRIMARY KEY,
    parent_id             INTEGER REFERENCES guacamole_connection_group(connection_group_id),
    connection_group_name VARCHAR(128) NOT NULL,
    type                  VARCHAR(32) NOT NULL DEFAULT 'ORGANIZATIONAL',
    max_connections       INTEGER,
    max_connections_per_user INTEGER,
    enable_session_affinity BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT guacamole_connection_group_name
        UNIQUE (parent_id, connection_group_name),
    CONSTRAINT guacamole_connection_group_type
        CHECK (type IN ('ORGANIZATIONAL', 'BALANCING'))
);

--
-- Table of connections
--
CREATE TABLE IF NOT EXISTS guacamole_connection (
    connection_id       SERIAL PRIMARY KEY,
    connection_name     VARCHAR(128) NOT NULL,
    parent_id           INTEGER REFERENCES guacamole_connection_group(connection_group_id),
    protocol            VARCHAR(32) NOT NULL,
    max_connections     INTEGER,
    max_connections_per_user INTEGER,
    connection_weight   INTEGER,
    failover_only       BOOLEAN NOT NULL DEFAULT FALSE,
    proxy_port          INTEGER,
    proxy_hostname      VARCHAR(512),
    proxy_encryption_method VARCHAR(32),

    CONSTRAINT guacamole_connection_name
        UNIQUE (parent_id, connection_name)
);

--
-- Table of connection parameters
--
CREATE TABLE IF NOT EXISTS guacamole_connection_parameter (
    connection_id   INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    parameter_name  VARCHAR(128) NOT NULL,
    parameter_value VARCHAR(4096) NOT NULL,

    PRIMARY KEY (connection_id, parameter_name)
);

--
-- Table of sharing profiles
--
CREATE TABLE IF NOT EXISTS guacamole_sharing_profile (
    sharing_profile_id    SERIAL PRIMARY KEY,
    sharing_profile_name  VARCHAR(128) NOT NULL,
    primary_connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,

    CONSTRAINT guacamole_sharing_profile_name
        UNIQUE (primary_connection_id, sharing_profile_name)
);

--
-- Table of sharing profile parameters
--
CREATE TABLE IF NOT EXISTS guacamole_sharing_profile_parameter (
    sharing_profile_id INTEGER NOT NULL REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    parameter_name     VARCHAR(128) NOT NULL,
    parameter_value    VARCHAR(4096) NOT NULL,

    PRIMARY KEY (sharing_profile_id, parameter_name)
);

--
-- Table of users
--
CREATE TABLE IF NOT EXISTS guacamole_entity (
    entity_id SERIAL PRIMARY KEY,
    name      VARCHAR(128) NOT NULL,
    type      VARCHAR(32) NOT NULL,

    CONSTRAINT guacamole_entity_name_type
        UNIQUE (name, type),
    CONSTRAINT guacamole_entity_type
        CHECK (type IN ('USER', 'USER_GROUP'))
);

CREATE TABLE IF NOT EXISTS guacamole_user (
    user_id                      SERIAL PRIMARY KEY,
    entity_id                    INTEGER NOT NULL UNIQUE REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    password_hash                BYTEA NOT NULL,
    password_salt                BYTEA,
    password_date                TIMESTAMPTZ,
    disabled                     BOOLEAN NOT NULL DEFAULT FALSE,
    expired                      BOOLEAN NOT NULL DEFAULT FALSE,
    access_window_start          TIME,
    access_window_end            TIME,
    valid_from                   DATE,
    valid_until                  DATE,
    timezone                     VARCHAR(64),
    full_name                    VARCHAR(256),
    email_address                VARCHAR(256),
    organization                 VARCHAR(256),
    organizational_role          VARCHAR(256)
);

--
-- Table of user groups
--
CREATE TABLE IF NOT EXISTS guacamole_user_group (
    user_group_id SERIAL PRIMARY KEY,
    entity_id     INTEGER NOT NULL UNIQUE REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    disabled      BOOLEAN NOT NULL DEFAULT FALSE
);

--
-- Table of user group membership
--
CREATE TABLE IF NOT EXISTS guacamole_user_group_member (
    user_group_id INTEGER NOT NULL REFERENCES guacamole_user_group(user_group_id) ON DELETE CASCADE,
    member_entity_id INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,

    PRIMARY KEY (user_group_id, member_entity_id)
);

--
-- Table of connection permissions
--
CREATE TABLE IF NOT EXISTS guacamole_connection_permission (
    entity_id     INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    permission    VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, connection_id, permission),
    CONSTRAINT guacamole_connection_permission_permission
        CHECK (permission IN ('READ', 'UPDATE', 'DELETE', 'ADMINISTER'))
);

--
-- Table of connection group permissions
--
CREATE TABLE IF NOT EXISTS guacamole_connection_group_permission (
    entity_id           INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    connection_group_id INTEGER NOT NULL REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    permission          VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, connection_group_id, permission),
    CONSTRAINT guacamole_connection_group_permission_permission
        CHECK (permission IN ('READ', 'UPDATE', 'DELETE', 'ADMINISTER'))
);

--
-- Table of sharing profile permissions
--
CREATE TABLE IF NOT EXISTS guacamole_sharing_profile_permission (
    entity_id          INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    sharing_profile_id INTEGER NOT NULL REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    permission         VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, sharing_profile_id, permission),
    CONSTRAINT guacamole_sharing_profile_permission_permission
        CHECK (permission IN ('READ', 'UPDATE', 'DELETE', 'ADMINISTER'))
);

--
-- Table of system permissions
--
CREATE TABLE IF NOT EXISTS guacamole_system_permission (
    entity_id  INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, permission),
    CONSTRAINT guacamole_system_permission_permission
        CHECK (permission IN ('CREATE_CONNECTION', 'CREATE_CONNECTION_GROUP',
            'CREATE_SHARING_PROFILE', 'CREATE_USER', 'CREATE_USER_GROUP', 'ADMINISTER'))
);

--
-- Table of user permissions
--
CREATE TABLE IF NOT EXISTS guacamole_user_permission (
    entity_id        INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    affected_user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    permission       VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, affected_user_id, permission),
    CONSTRAINT guacamole_user_permission_permission
        CHECK (permission IN ('READ', 'UPDATE', 'DELETE', 'ADMINISTER'))
);

--
-- Table of user group permissions
--
CREATE TABLE IF NOT EXISTS guacamole_user_group_permission (
    entity_id              INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    affected_user_group_id INTEGER NOT NULL REFERENCES guacamole_user_group(user_group_id) ON DELETE CASCADE,
    permission             VARCHAR(32) NOT NULL,

    PRIMARY KEY (entity_id, affected_user_group_id, permission),
    CONSTRAINT guacamole_user_group_permission_permission
        CHECK (permission IN ('READ', 'UPDATE', 'DELETE', 'ADMINISTER'))
);

--
-- Table of connection history
--
CREATE TABLE IF NOT EXISTS guacamole_connection_history (
    history_id           SERIAL PRIMARY KEY,
    user_id              INTEGER REFERENCES guacamole_user(user_id) ON DELETE SET NULL,
    username             VARCHAR(128) NOT NULL,
    remote_host          VARCHAR(256),
    connection_id        INTEGER REFERENCES guacamole_connection(connection_id) ON DELETE SET NULL,
    connection_name      VARCHAR(128) NOT NULL,
    sharing_profile_id   INTEGER REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE SET NULL,
    sharing_profile_name VARCHAR(128),
    start_date           TIMESTAMPTZ NOT NULL,
    end_date             TIMESTAMPTZ
);

--
-- Table of user password history
--
CREATE TABLE IF NOT EXISTS guacamole_user_password_history (
    password_history_id SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    password_hash       BYTEA NOT NULL,
    password_salt       BYTEA,
    password_date       TIMESTAMPTZ NOT NULL
);

--
-- Table of user attributes
--
CREATE TABLE IF NOT EXISTS guacamole_user_attribute (
    user_id         INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    attribute_name  VARCHAR(128) NOT NULL,
    attribute_value VARCHAR(4096) NOT NULL,

    PRIMARY KEY (user_id, attribute_name)
);

--
-- Create indices for performance
--
CREATE INDEX IF NOT EXISTS guacamole_connection_history_start_date
    ON guacamole_connection_history(start_date);
CREATE INDEX IF NOT EXISTS guacamole_connection_history_end_date
    ON guacamole_connection_history(end_date);
CREATE INDEX IF NOT EXISTS guacamole_connection_history_connection_id
    ON guacamole_connection_history(connection_id);
CREATE INDEX IF NOT EXISTS guacamole_connection_history_user_id
    ON guacamole_connection_history(user_id);

--
-- Create default admin user (password: guacadmin)
-- IMPORTANT: Change this password immediately after first login!
--
INSERT INTO guacamole_entity (name, type) VALUES ('guacadmin', 'USER')
ON CONFLICT DO NOTHING;

INSERT INTO guacamole_user (entity_id, password_hash, password_salt, password_date)
SELECT
    entity_id,
    decode('CA458A7D494E3BE824F5E1E175A1556C0F8EEF2C2D7DF3633BEC4A29C4411960', 'hex'),
    decode('FE24ADC5E11E2B25288D1704ABE67A79E342ECC26064CE69C5B3177795A82264', 'hex'),
    NOW()
FROM guacamole_entity WHERE name = 'guacadmin'
ON CONFLICT DO NOTHING;

INSERT INTO guacamole_system_permission (entity_id, permission)
SELECT entity_id, permission::VARCHAR(32)
FROM guacamole_entity, (VALUES
    ('CREATE_CONNECTION'),
    ('CREATE_CONNECTION_GROUP'),
    ('CREATE_SHARING_PROFILE'),
    ('CREATE_USER'),
    ('CREATE_USER_GROUP'),
    ('ADMINISTER')
) AS permissions(permission)
WHERE guacamole_entity.name = 'guacadmin'
ON CONFLICT DO NOTHING;

INSERT INTO guacamole_user_permission (entity_id, affected_user_id, permission)
SELECT e.entity_id, u.user_id, 'READ'
FROM guacamole_entity e, guacamole_user u, guacamole_entity ue
WHERE e.name = 'guacadmin' AND ue.name = 'guacadmin' AND u.entity_id = ue.entity_id
ON CONFLICT DO NOTHING;
