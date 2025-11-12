# Quick Guide: Apply Migration and Test

## Step 1: Apply Migration to Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Create enum type for mobility assistance devices if it doesn't exist
DO $$ BEGIN
    CREATE TYPE mobility_assistance_enum AS ENUM ('cane', 'light walker', 'roll-leader');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add column to staff_profiles for mobility devices drivers cannot handle
ALTER TABLE staff_profiles 
ADD COLUMN IF NOT EXISTS cannot_handle_mobility_devices mobility_assistance_enum[] DEFAULT ARRAY[]::mobility_assistance_enum[];

-- Add comment to explain the field
COMMENT ON COLUMN staff_profiles.cannot_handle_mobility_devices IS 
'Array of mobility assistance devices that this driver cannot handle. Used as a hard filter in ride matching - drivers with a client''s mobility device in this array will be excluded from matches.';
```

6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

## Step 2: Verify Migration

Run this query to verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff_profiles' 
AND column_name = 'cannot_handle_mobility_devices';
```

You should see the column listed.

## Step 3: Test the Feature

### A. Set Driver Limitations
1. Go to Admin > Users
2. Edit a driver (or create a new one)
3. Go to Step 3
4. Check one or more mobility devices under "Cannot Handle Mobility Devices"
5. Save

### B. Create a Test Ride
1. Go to Dispatcher > Rides
2. Create a new ride
3. Select a client who has a mobility device (e.g., "cane")
4. Save the ride

### C. Test Matching
1. Click "Send Ride Request" on the ride
2. Check the results:
   - Drivers who CANNOT handle the client's device should appear in **"Excluded Drivers"** section
   - Exclusion reason should say: "Driver cannot handle {device} mobility devices"
   - Drivers who CAN handle it (or have no limitations) should appear in **"Available Drivers"**

## Step 4: Test Different Scenarios

1. **Driver with no limitations** → Should match all clients
2. **Driver who cannot handle "cane"** → Should be excluded from rides with clients using cane
3. **Client with no mobility device** → Should match all drivers
4. **Multiple limitations** → Driver should be excluded from all matching clients

