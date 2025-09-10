-- ========================================================
-- DriveKind Database Schema
-- ========================================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS transactionsauditlog CASCADE;
DROP TABLE IF EXISTS timecards CASCADE;
DROP TABLE IF EXISTS completedrides CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS volunteers CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS training CASCADE;
DROP TABLE IF EXISTS userroles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS profile CASCADE;
DROP TABLE IF EXISTS organization CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS contact_pref_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS driver_status_enum CASCADE;
DROP TYPE IF EXISTS volunteer_status_enum CASCADE;
DROP TYPE IF EXISTS background_check_status_enum CASCADE;
DROP TYPE IF EXISTS ride_status_enum CASCADE;
DROP TYPE IF EXISTS call_type_enum CASCADE;

-- ========================================================
-- ENUM TYPES
-- ========================================================

CREATE TYPE contact_pref_enum AS ENUM ('Phone','Email','Text');
CREATE TYPE gender_enum AS ENUM ('Male','Female','Other');
CREATE TYPE role_enum AS ENUM ('Admin','Dispatcher','Driver','Volunteer','Client','Super Admin');
CREATE TYPE driver_status_enum AS ENUM ('Active','Inactive','Suspended');
CREATE TYPE volunteer_status_enum AS ENUM ('Active','Inactive');
CREATE TYPE background_check_status_enum AS ENUM ('Pending','Passed','Failed');
CREATE TYPE ride_status_enum AS ENUM ('Requested','Scheduled','In Progress','Completed','Cancelled');
CREATE TYPE call_type_enum AS ENUM ('Inbound','Outbound');

-- ========================================================
-- TABLES
-- ========================================================

-- Organization table
CREATE TABLE organization (
    org_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Profile table (extends auth.users)
CREATE TABLE profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    name role_enum,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Roles table
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name role_enum UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- User roles junction table
CREATE TABLE userroles (
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT now(),
    assigned_by UUID REFERENCES profile(user_id),
    PRIMARY KEY (user_id, role_id)
);

-- Clients table
CREATE TABLE clients (
    client_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    primary_phone TEXT,
    secondary_phone TEXT,
    contact_pref contact_pref_enum,
    gender gender_enum,
    street_address TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    lives_alone BOOLEAN,
    mobility_needs TEXT,
    medical_needs TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Vehicles table
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    vehicle_make TEXT,
    vehicle_model TEXT,
    license_plate TEXT,
    max_passengers INT,
    insurance_expiry DATE,
    driver_status driver_status_enum,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Training table
CREATE TABLE training (
    training_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    training_date DATE,
    background_check_status background_check_status_enum,
    volunteer_status volunteer_status_enum,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Drivers table
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    license_number TEXT,
    license_expiry DATE,
    insurance_provider TEXT,
    vehicle_id INT REFERENCES vehicles(vehicle_id),
    status driver_status_enum DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Volunteers table
CREATE TABLE volunteers (
    volunteer_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id) ON DELETE CASCADE,
    org_id INT REFERENCES organization(org_id),
    skills TEXT[],
    availability JSONB,
    status volunteer_status_enum DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Rides table
CREATE TABLE rides (
    ride_id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organization(org_id),
    client_id INT REFERENCES clients(client_id),
    driver_id INT REFERENCES drivers(driver_id),
    vehicle_id INT REFERENCES vehicles(vehicle_id),
    dispatcher_name TEXT,
    pickup_address TEXT,
    dropoff_address TEXT,
    scheduled_time TIMESTAMP,
    status ride_status_enum DEFAULT 'Requested',
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Completed rides table
CREATE TABLE completedrides (
    completed_ride_id SERIAL PRIMARY KEY,
    ride_id INT REFERENCES rides(ride_id) ON DELETE CASCADE,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    miles_driven DECIMAL(6,2),
    hours DECIMAL(4,2),
    donation_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT now()
);

-- Calls table
CREATE TABLE calls (
    call_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id),
    org_id INT REFERENCES organization(org_id),
    call_time TIMESTAMP,
    call_type call_type_enum,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Transactions audit log table
CREATE TABLE transactionsauditlog (
    transaction_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id),
    org_id INT REFERENCES organization(org_id),
    action TEXT,
    table_name TEXT,
    record_id INT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT now()
);

-- Timecards table
CREATE TABLE timecards (
    timecard_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profile(user_id),
    org_id INT REFERENCES organization(org_id),
    shift_start TIMESTAMP,
    shift_end TIMESTAMP,
    hours DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT now()
);

-- ========================================================
-- INDEXES
-- ========================================================

-- Organization indexes
CREATE INDEX idx_organization_name ON organization(name);

-- Profile indexes
CREATE INDEX idx_profile_org_id ON profile(org_id);
CREATE INDEX idx_profile_email ON profile(email);

-- User roles indexes
CREATE INDEX idx_userroles_user_id ON userroles(user_id);
CREATE INDEX idx_userroles_role_id ON userroles(role_id);

-- Clients indexes
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- Drivers indexes
CREATE INDEX idx_drivers_org_id ON drivers(org_id);
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);

-- Volunteers indexes
CREATE INDEX idx_volunteers_org_id ON volunteers(org_id);
CREATE INDEX idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX idx_volunteers_status ON volunteers(status);

-- Rides indexes
CREATE INDEX idx_rides_org_id ON rides(org_id);
CREATE INDEX idx_rides_client_id ON rides(client_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_scheduled_time ON rides(scheduled_time);

-- Audit log indexes
CREATE INDEX idx_transactionsauditlog_user_id ON transactionsauditlog(user_id);
CREATE INDEX idx_transactionsauditlog_org_id ON transactionsauditlog(org_id);
CREATE INDEX idx_transactionsauditlog_timestamp ON transactionsauditlog(timestamp);

-- ========================================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_updated_at BEFORE UPDATE ON training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

