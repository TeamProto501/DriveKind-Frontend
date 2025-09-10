-- ========================================================
-- DriveKind Row Level Security (RLS) Policies
-- ========================================================

-- ========================================================
-- FUNCTION: Check if current user is a Super Admin
-- ========================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM userroles ur
        JOIN roles ro ON ur.role_id = ro.role_id
        WHERE ur.user_id = auth.uid()
          AND ro.name = 'Super Admin'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================================
-- ORGANIZATION
-- ========================================================
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_policy ON organization;
DROP POLICY IF EXISTS org_modify_policy ON organization;

CREATE POLICY org_select_policy
ON organization FOR SELECT
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro2 ON ur.role_id = ro2.role_id
        WHERE p.org_id = organization.org_id
          AND p.user_id = auth.uid()
          AND ro2.name = 'Admin'
    )
);

CREATE POLICY org_modify_policy
ON organization FOR ALL
USING (is_super_admin());

-- ========================================================
-- PROFILE
-- ========================================================
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_select_policy ON profile;
DROP POLICY IF EXISTS profile_modify_policy ON profile;

CREATE POLICY profile_select_policy
ON profile FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro3 ON ur.role_id = ro3.role_id
        WHERE p.org_id = profile.org_id
          AND p.user_id = auth.uid()
          AND ro3.name = 'Admin'
    )
);

CREATE POLICY profile_modify_policy
ON profile FOR UPDATE
USING (
    is_super_admin() OR
    user_id = auth.uid()
);

-- ========================================================
-- ROLES
-- ========================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_manage_policy ON roles;

CREATE POLICY roles_manage_policy
ON roles FOR ALL
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM userroles ur
        JOIN roles ro4 ON ur.role_id = ro4.role_id
        WHERE ur.user_id = auth.uid()
          AND ro4.name = 'Admin'
    )
);

-- ========================================================
-- USERROLES
-- ========================================================
ALTER TABLE userroles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS userroles_manage_policy ON userroles;

CREATE POLICY userroles_manage_policy
ON userroles FOR ALL
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM userroles ur
        JOIN roles ro5 ON ur.role_id = ro5.role_id
        JOIN profile p ON ur.user_id = p.user_id
        WHERE ur.user_id = auth.uid()
          AND ro5.name = 'Admin'
    )
);

-- ========================================================
-- CLIENTS
-- ========================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_select_policy ON clients;
DROP POLICY IF EXISTS clients_modify_policy ON clients;

CREATE POLICY clients_select_policy
ON clients FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro6 ON ur.role_id = ro6.role_id
        WHERE p.org_id = (
            SELECT p2.org_id FROM profile p2 WHERE p2.user_id = clients.user_id
        )
        AND p.user_id = auth.uid()
        AND ro6.name = 'Admin'
    )
);

CREATE POLICY clients_modify_policy
ON clients FOR UPDATE
USING (
    is_super_admin() OR user_id = auth.uid()
);

-- ========================================================
-- DRIVERS
-- ========================================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drivers_select_policy ON drivers;
DROP POLICY IF EXISTS drivers_modify_policy ON drivers;

CREATE POLICY drivers_select_policy
ON drivers FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro7 ON ur.role_id = ro7.role_id
        WHERE p.org_id = (
            SELECT p2.org_id FROM profile p2 WHERE p2.user_id = drivers.user_id
        )
        AND p.user_id = auth.uid()
        AND ro7.name = 'Admin'
    )
);

CREATE POLICY drivers_modify_policy
ON drivers FOR UPDATE
USING (
    is_super_admin() OR user_id = auth.uid()
);

-- ========================================================
-- VOLUNTEERS
-- ========================================================
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS volunteers_select_policy ON volunteers;
DROP POLICY IF EXISTS volunteers_modify_policy ON volunteers;

CREATE POLICY volunteers_select_policy
ON volunteers FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro8 ON ur.role_id = ro8.role_id
        WHERE p.org_id = (
            SELECT p2.org_id FROM profile p2 WHERE p2.user_id = volunteers.user_id
        )
        AND p.user_id = auth.uid()
        AND ro8.name = 'Admin'
    )
);

CREATE POLICY volunteers_modify_policy
ON volunteers FOR UPDATE
USING (
    is_super_admin() OR user_id = auth.uid()
);

-- ========================================================
-- VEHICLES
-- ========================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vehicles_select_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_modify_policy ON vehicles;

CREATE POLICY vehicles_select_policy
ON vehicles FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro9 ON ur.role_id = ro9.role_id
        WHERE p.org_id = vehicles.org_id
          AND p.user_id = auth.uid()
          AND ro9.name = 'Admin'
    )
);

CREATE POLICY vehicles_modify_policy
ON vehicles FOR UPDATE
USING (
    is_super_admin() OR user_id = auth.uid()
);

-- ========================================================
-- TRAINING
-- ========================================================
ALTER TABLE training ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_select_policy ON training;
DROP POLICY IF EXISTS training_modify_policy ON training;

CREATE POLICY training_select_policy
ON training FOR SELECT
USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro10 ON ur.role_id = ro10.role_id
        WHERE p.org_id = training.org_id
          AND p.user_id = auth.uid()
          AND ro10.name = 'Admin'
    )
);

CREATE POLICY training_modify_policy
ON training FOR UPDATE
USING (
    is_super_admin() OR user_id = auth.uid()
);

-- ========================================================
-- RIDES
-- ========================================================
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rides_policy ON rides;

CREATE POLICY rides_policy
ON rides FOR ALL
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro11 ON ur.role_id = ro11.role_id
        WHERE p.org_id = rides.org_id
          AND p.user_id = auth.uid()
          AND (ro11.name = 'Admin' OR ro11.name = 'Dispatcher')
    )
);

-- ========================================================
-- COMPLETEDRIDES
-- ========================================================
ALTER TABLE completedrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS completedrides_policy ON completedrides;

CREATE POLICY completedrides_policy
ON completedrides FOR ALL
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM rides ri
        JOIN profile p ON p.org_id = ri.org_id
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro12 ON ur.role_id = ro12.role_id
        WHERE ri.ride_id = completedrides.ride_id
          AND p.user_id = auth.uid()
          AND (ro12.name = 'Admin' OR ro12.name = 'Dispatcher')
    )
);

-- ========================================================
-- CALLS
-- ========================================================
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calls_policy ON calls;

CREATE POLICY calls_policy
ON calls FOR ALL
USING (
    is_super_admin() OR user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro13 ON ur.role_id = ro13.role_id
        WHERE p.org_id = calls.org_id
          AND p.user_id = auth.uid()
          AND ro13.name = 'Admin'
    )
);

-- ========================================================
-- TRANSACTIONSAUDITLOG
-- ========================================================
ALTER TABLE transactionsauditlog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactionsauditlog_policy ON transactionsauditlog;

CREATE POLICY transactionsauditlog_policy
ON transactionsauditlog FOR ALL
USING (
    is_super_admin() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro14 ON ur.role_id = ro14.role_id
        WHERE p.org_id = transactionsauditlog.org_id
          AND p.user_id = auth.uid()
          AND ro14.name = 'Admin'
    )
);

-- ========================================================
-- TIMECARDS
-- ========================================================
ALTER TABLE timecards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timecards_policy ON timecards;

CREATE POLICY timecards_policy
ON timecards FOR ALL
USING (
    is_super_admin() OR user_id = auth.uid() OR
    EXISTS (
        SELECT 1
        FROM profile p
        JOIN userroles ur ON ur.user_id = p.user_id
        JOIN roles ro15 ON ur.role_id = ro15.role_id
        WHERE p.org_id = timecards.org_id
          AND p.user_id = auth.uid()
          AND ro15.name = 'Admin'
    )
);

