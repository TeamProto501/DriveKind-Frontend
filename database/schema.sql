-- DriveKind Database Schema for Supabase
-- This file contains all the necessary tables and relationships

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    org_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    head_admin_id UUID REFERENCES auth.users(id),
    street_address VARCHAR(255),
    address2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id INTEGER REFERENCES organizations(org_id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    contact_pref VARCHAR(10) CHECK (contact_pref IN ('Phone', 'Email', 'Text')) DEFAULT 'Phone',
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    street_address VARCHAR(255),
    address2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    lives_alone BOOLEAN DEFAULT false,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('Super Admin', 'Admin', 'Dispatcher', 'Driver', 'Volunteer', 'Client')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides/Requests table
CREATE TABLE rides (
    ride_id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES profiles(user_id),
    driver_id UUID REFERENCES profiles(user_id),
    dispatcher_id UUID REFERENCES profiles(user_id),
    org_id INTEGER REFERENCES organizations(org_id),
    ride_type VARCHAR(50) CHECK (ride_type IN ('Medical', 'Tax', 'Shopping', 'Social', 'Other')) NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_address2 VARCHAR(255),
    pickup_city VARCHAR(100) NOT NULL,
    pickup_state VARCHAR(50) NOT NULL,
    pickup_zip VARCHAR(20) NOT NULL,
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_address2 VARCHAR(255),
    dropoff_city VARCHAR(100) NOT NULL,
    dropoff_state VARCHAR(50) NOT NULL,
    dropoff_zip VARCHAR(20) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    is_one_way BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern VARCHAR(50), -- 'weekly', 'monthly', etc.
    status VARCHAR(20) CHECK (status IN ('Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled')) DEFAULT 'Pending',
    notes TEXT,
    special_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver availability/schedule table
CREATE TABLE driver_availability (
    availability_id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(user_id),
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);

-- Time-off requests table
CREATE TABLE time_off_requests (
    request_id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(user_id),
    reason VARCHAR(50) CHECK (reason IN ('Medical', 'Vacation', 'Emergency', 'Personal', 'Other')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Denied')) DEFAULT 'Pending',
    notes TEXT,
    approved_by UUID REFERENCES profiles(user_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table
CREATE TABLE donations (
    donation_id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(ride_id),
    client_id UUID REFERENCES profiles(user_id),
    donation_type VARCHAR(50) CHECK (donation_type IN ('Cash', 'Check', 'Online', 'Other')) NOT NULL,
    amount DECIMAL(10,2),
    received BOOLEAN DEFAULT false,
    received_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id),
    report_type VARCHAR(50) CHECK (report_type IN ('Appointments', 'Assigned Rides', 'Donations', 'Driver Performance', 'Client Usage', 'Financial')) NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    filters JSONB, -- Store filter criteria as JSON
    generated_by UUID REFERENCES profiles(user_id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_data JSONB, -- Store report results as JSON
    file_url TEXT -- URL to generated report file
);

-- Audit logs table
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(user_id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) CHECK (status IN ('SUCCESS', 'FAILED')) DEFAULT 'SUCCESS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table
CREATE TABLE system_config (
    config_id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(org_id),
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) CHECK (config_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, config_key)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_rides_client_id ON rides(client_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_dispatcher_id ON rides(dispatcher_id);
CREATE INDEX idx_rides_org_id ON rides(org_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_scheduled_date ON rides(scheduled_date);
CREATE INDEX idx_driver_availability_driver_id ON driver_availability(driver_id);
CREATE INDEX idx_driver_availability_date ON driver_availability(date);
CREATE INDEX idx_time_off_requests_driver_id ON time_off_requests(driver_id);
CREATE INDEX idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Super admins can view all organizations" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'Super Admin'
        )
    );

CREATE POLICY "Admins can view their organization" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND org_id = organizations.org_id
            AND role IN ('Admin', 'Dispatcher')
        )
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view profiles in their organization" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.user_id = auth.uid() 
            AND admin_profile.org_id = profiles.org_id
            AND admin_profile.role IN ('Admin', 'Dispatcher')
        )
    );

CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'Super Admin'
        )
    );

-- RLS Policies for rides
CREATE POLICY "Users can view rides they're involved in" ON rides
    FOR SELECT USING (
        client_id = auth.uid() OR 
        driver_id = auth.uid() OR 
        dispatcher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND org_id = rides.org_id
            AND role IN ('Admin', 'Dispatcher')
        )
    );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_availability_updated_at BEFORE UPDATE ON driver_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
