-- ========================================================
-- DriveKind Seed Data
-- ========================================================

-- ========================================================
-- INSERT ROLES
-- ========================================================
INSERT INTO roles (name, description, permissions) VALUES
('Super Admin', 'Full system access with all permissions', '{"all": true}'),
('Admin', 'Organization-level administrative access', '{"org_manage": true, "users_manage": true, "rides_manage": true, "reports_view": true}'),
('Dispatcher', 'Ride scheduling and dispatch management', '{"rides_manage": true, "drivers_view": true, "clients_view": true}'),
('Driver', 'Driver with vehicle and ride management', '{"rides_view": true, "profile_manage": true}'),
('Volunteer', 'Volunteer with limited access', '{"profile_manage": true, "rides_view": true}'),
('Client', 'Client with ride request access', '{"rides_request": true, "profile_manage": true}');

-- ========================================================
-- INSERT SAMPLE ORGANIZATIONS
-- ========================================================
INSERT INTO organization (name, contact_email, contact_phone, address, city, state, zip_code) VALUES
('DriveKind Main', 'admin@drivekind.com', '(555) 123-4567', '123 Main St', 'Rochester', 'NY', '14623'),
('Rochester Community Transport', 'info@rct.org', '(555) 234-5678', '456 Community Ave', 'Rochester', 'NY', '14620'),
('Monroe County Rides', 'contact@monroerides.org', '(555) 345-6789', '789 County Rd', 'Rochester', 'NY', '14618');

-- ========================================================
-- INSERT SAMPLE VEHICLES
-- ========================================================
INSERT INTO vehicles (user_id, org_id, vehicle_make, vehicle_model, license_plate, max_passengers, insurance_expiry, driver_status) VALUES
-- Note: These will need actual user_id values from auth.users
-- (uuid_generate_v4(), 1, 'Ford', 'Transit', 'ABC-123', 8, '2025-12-31', 'Active'),
-- (uuid_generate_v4(), 1, 'Chevrolet', 'Express', 'DEF-456', 12, '2025-11-30', 'Active'),
-- (uuid_generate_v4(), 2, 'Mercedes', 'Sprinter', 'GHI-789', 10, '2025-10-31', 'Active');

-- ========================================================
-- INSERT SAMPLE TRAINING RECORDS
-- ========================================================
-- Note: These will need actual user_id values from auth.users
-- INSERT INTO training (user_id, org_id, training_date, background_check_status, volunteer_status) VALUES
-- (uuid_generate_v4(), 1, '2024-01-15', 'Passed', 'Active'),
-- (uuid_generate_v4(), 1, '2024-02-20', 'Passed', 'Active'),
-- (uuid_generate_v4(), 2, '2024-03-10', 'Passed', 'Active');

-- ========================================================
-- INSERT SAMPLE CLIENTS
-- ========================================================
-- Note: These will need actual user_id values from auth.users
-- INSERT INTO clients (user_id, org_id, first_name, last_name, date_of_birth, primary_phone, contact_pref, gender, street_address, city, state, zip_code, lives_alone, mobility_needs, emergency_contact_name, emergency_contact_phone) VALUES
-- (uuid_generate_v4(), 1, 'John', 'Doe', '1950-05-15', '(555) 111-2222', 'Phone', 'Male', '123 Oak St', 'Rochester', 'NY', '14623', true, 'Wheelchair accessible', 'Jane Doe', '(555) 111-3333'),
-- (uuid_generate_v4(), 1, 'Mary', 'Smith', '1945-08-22', '(555) 222-3333', 'Email', 'Female', '456 Pine Ave', 'Rochester', 'NY', '14620', false, 'Walking assistance', 'Bob Smith', '(555) 222-4444'),
-- (uuid_generate_v4(), 2, 'Robert', 'Johnson', '1960-12-03', '(555) 333-4444', 'Text', 'Male', '789 Elm St', 'Rochester', 'NY', '14618', true, 'None', 'Sarah Johnson', '(555) 333-5555');

-- ========================================================
-- INSERT SAMPLE RIDES
-- ========================================================
-- Note: These will need actual client_id and driver_id values
-- INSERT INTO rides (org_id, client_id, driver_id, vehicle_id, dispatcher_name, pickup_address, dropoff_address, scheduled_time, status, notes) VALUES
-- (1, 1, 1, 1, 'Admin User', '123 Oak St, Rochester, NY', '456 Medical Center Dr, Rochester, NY', '2024-01-20 09:00:00', 'Scheduled', 'Regular medical appointment'),
-- (1, 2, 2, 2, 'Admin User', '456 Pine Ave, Rochester, NY', '789 Shopping Mall, Rochester, NY', '2024-01-21 14:30:00', 'Requested', 'Grocery shopping trip'),
-- (2, 3, 3, 3, 'Dispatcher User', '789 Elm St, Rochester, NY', '321 Community Center, Rochester, NY', '2024-01-22 10:15:00', 'In Progress', 'Community event');

-- ========================================================
-- INSERT SAMPLE CALLS
-- ========================================================
-- Note: These will need actual user_id values from auth.users
-- INSERT INTO calls (user_id, org_id, call_time, call_type, notes) VALUES
-- (uuid_generate_v4(), 1, '2024-01-15 08:30:00', 'Inbound', 'Client called to schedule ride for next week'),
-- (uuid_generate_v4(), 1, '2024-01-15 14:20:00', 'Outbound', 'Follow-up call to confirm ride details'),
-- (uuid_generate_v4(), 2, '2024-01-16 09:45:00', 'Inbound', 'New client registration inquiry');

-- ========================================================
-- INSERT SAMPLE AUDIT LOG ENTRIES
-- ========================================================
-- Note: These will need actual user_id values from auth.users
-- INSERT INTO transactionsauditlog (user_id, org_id, action, table_name, record_id, old_values, new_values) VALUES
-- (uuid_generate_v4(), 1, 'INSERT', 'clients', 1, null, '{"first_name": "John", "last_name": "Doe"}'),
-- (uuid_generate_v4(), 1, 'UPDATE', 'rides', 1, '{"status": "Requested"}', '{"status": "Scheduled"}'),
-- (uuid_generate_v4(), 2, 'INSERT', 'drivers', 1, null, '{"license_number": "D123456789"}');

-- ========================================================
-- INSERT SAMPLE TIMECARDS
-- ========================================================
-- Note: These will need actual user_id values from auth.users
-- INSERT INTO timecards (user_id, org_id, shift_start, shift_end, hours) VALUES
-- (uuid_generate_v4(), 1, '2024-01-15 08:00:00', '2024-01-15 16:00:00', 8.0),
-- (uuid_generate_v4(), 1, '2024-01-16 09:00:00', '2024-01-16 17:00:00', 8.0),
-- (uuid_generate_v4(), 2, '2024-01-15 10:00:00', '2024-01-15 18:00:00', 8.0);

-- ========================================================
-- HELPFUL QUERIES FOR TESTING
-- ========================================================

-- View all organizations
-- SELECT * FROM organization;

-- View all roles
-- SELECT * FROM roles;

-- View all vehicles
-- SELECT * FROM vehicles;

-- View all clients
-- SELECT * FROM clients;

-- View all rides with status
-- SELECT r.*, c.first_name, c.last_name, d.license_number 
-- FROM rides r 
-- LEFT JOIN clients c ON r.client_id = c.client_id 
-- LEFT JOIN drivers d ON r.driver_id = d.driver_id;

-- View audit log entries
-- SELECT * FROM transactionsauditlog ORDER BY timestamp DESC LIMIT 10;

