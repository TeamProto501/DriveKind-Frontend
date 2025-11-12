# Supabase Setup Instructions - Driver Mobility Limitations

## Step 1: Apply Migration to Supabase

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire migration SQL from `database/migrations/add_driver_mobility_limitations.sql`:

```sql
-- Create enum type for mobility assistance devices if it doesn't exist
DO $$ BEGIN
    CREATE TYPE mobility_assistance_enum AS ENUM ('cane', 'light walker', 'roll-leader');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add column to staff_profiles for mobility devices drivers cannot handle
-- This is an array of mobility_assistance_enum values
ALTER TABLE staff_profiles 
ADD COLUMN IF NOT EXISTS cannot_handle_mobility_devices mobility_assistance_enum[] DEFAULT ARRAY[]::mobility_assistance_enum[];

-- Add comment to explain the field
COMMENT ON COLUMN staff_profiles.cannot_handle_mobility_devices IS 
'Array of mobility assistance devices that this driver cannot handle. Used as a hard filter in ride matching - drivers with a client''s mobility device in this array will be excluded from matches.';
```

6. Click **Run** to execute the migration
7. Verify it worked by checking the `staff_profiles` table structure

### Option B: Using Supabase CLI (If you have it set up)

```bash
# If you have Supabase CLI configured
supabase db push
# Or apply the migration directly
supabase migration up
```

## Step 2: Verify the Migration

Run this query in Supabase SQL Editor to verify:

```sql
-- Check if column exists
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'staff_profiles' 
AND column_name = 'cannot_handle_mobility_devices';

-- Check if enum type exists
SELECT typname 
FROM pg_type 
WHERE typname = 'mobility_assistance_enum';
```

You should see:
- Column: `cannot_handle_mobility_devices` with type `ARRAY`
- Enum type: `mobility_assistance_enum`

## Step 3: Test the Field

Test inserting/updating a driver with limitations:

```sql
-- Example: Set a driver to not handle "cane" and "light walker"
UPDATE staff_profiles
SET cannot_handle_mobility_devices = ARRAY['cane', 'light walker']::mobility_assistance_enum[]
WHERE user_id = 'some-driver-user-id';

-- Verify it was set correctly
SELECT user_id, first_name, last_name, cannot_handle_mobility_devices
FROM staff_profiles
WHERE user_id = 'some-driver-user-id';
```

## Step 4: Backend API Integration

Your backend API (`VITE_API_URL`) needs to implement the hard filter in the ride matching endpoint.

### Endpoint: `POST /rides/:rideId/match-drivers`

### Required Changes:

#### 1. Fetch Client's Mobility Device

When fetching ride data, include the client's `mobility_assistance_enum`:

```sql
SELECT 
  r.*,
  c.mobility_assistance_enum,
  c.first_name as client_first_name,
  c.last_name as client_last_name
FROM rides r
JOIN clients c ON r.client_id = c.client_id
WHERE r.ride_id = $1
```

#### 2. Fetch Drivers with Limitations

When fetching drivers for matching, include the `cannot_handle_mobility_devices` field:

```sql
SELECT 
  user_id,
  first_name,
  last_name,
  cannot_handle_mobility_devices,
  -- ... other driver fields
FROM staff_profiles
WHERE role @> ARRAY['Driver']::text[]
  AND org_id = $1
```

#### 3. Implement Hard Filter Logic

**JavaScript/TypeScript Example:**

```typescript
async function matchDrivers(rideId: number, orgId: number) {
  // 1. Get ride with client mobility device
  const ride = await db.query(`
    SELECT r.*, c.mobility_assistance_enum
    FROM rides r
    JOIN clients c ON r.client_id = c.client_id
    WHERE r.ride_id = $1 AND r.org_id = $2
  `, [rideId, orgId]);

  const clientMobilityDevice = ride.mobility_assistance_enum;

  // 2. Get all drivers
  const drivers = await db.query(`
    SELECT 
      user_id,
      first_name,
      last_name,
      cannot_handle_mobility_devices
    FROM staff_profiles
    WHERE role @> ARRAY['Driver']::text[]
      AND org_id = $1
  `, [orgId]);

  const available = [];
  const excluded = [];

  for (const driver of drivers) {
    // HARD FILTER: Exclude if driver cannot handle client's mobility device
    if (clientMobilityDevice && driver.cannot_handle_mobility_devices) {
      // Check if client's device is in driver's cannot_handle array
      if (driver.cannot_handle_mobility_devices.includes(clientMobilityDevice)) {
        excluded.push({
          user_id: driver.user_id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          match_quality: 'excluded',
          exclusion_reasons: [
            `Driver cannot handle ${clientMobilityDevice} mobility devices`
          ]
        });
        continue; // Skip this driver - don't add to available
      }
    }

    // Driver passed the hard filter - continue with normal matching logic
    available.push({
      user_id: driver.user_id,
      first_name: driver.first_name,
      last_name: driver.last_name,
      match_quality: 'excellent', // or calculate based on other factors
      reasons: ['Available driver']
    });
  }

  return { available, excluded };
}
```

**Python Example:**

```python
def match_drivers(ride_id: int, org_id: int):
    # 1. Get ride with client mobility device
    ride = db.execute("""
        SELECT r.*, c.mobility_assistance_enum
        FROM rides r
        JOIN clients c ON r.client_id = c.client_id
        WHERE r.ride_id = %s AND r.org_id = %s
    """, (ride_id, org_id)).fetchone()
    
    client_mobility_device = ride['mobility_assistance_enum']
    
    # 2. Get all drivers
    drivers = db.execute("""
        SELECT 
            user_id,
            first_name,
            last_name,
            cannot_handle_mobility_devices
        FROM staff_profiles
        WHERE role @> ARRAY['Driver']::text[]
            AND org_id = %s
    """, (org_id,)).fetchall()
    
    available = []
    excluded = []
    
    for driver in drivers:
        # HARD FILTER: Exclude if driver cannot handle client's mobility device
        if client_mobility_device and driver['cannot_handle_mobility_devices']:
            if client_mobility_device in driver['cannot_handle_mobility_devices']:
                excluded.append({
                    'user_id': driver['user_id'],
                    'first_name': driver['first_name'],
                    'last_name': driver['last_name'],
                    'match_quality': 'excluded',
                    'exclusion_reasons': [
                        f"Driver cannot handle {client_mobility_device} mobility devices"
                    ]
                })
                continue  # Skip this driver
        
        # Driver passed the hard filter
        available.append({
            'user_id': driver['user_id'],
            'first_name': driver['first_name'],
            'last_name': driver['last_name'],
            'match_quality': 'excellent',
            'reasons': ['Available driver']
        })
    
    return {'available': available, 'excluded': excluded}
```

## Step 5: Frontend Usage

The frontend is already set up! When you:

1. **Create/Edit a Driver** in Admin > Users:
   - Go to Step 3
   - You'll see checkboxes for "Cannot Handle Mobility Devices"
   - Select the devices the driver cannot handle
   - Save the user

2. **View a Driver**:
   - The limitations will display as: "Cane, Light walker" (or "None" if empty)

3. **Ride Matching**:
   - When dispatcher clicks "Send Ride Request"
   - Backend API filters drivers based on client's mobility device
   - Drivers who cannot handle the client's device appear in "Excluded Drivers" section

## Important Notes

- **Hard Filter**: This is a complete exclusion - drivers matching the criteria won't appear in available drivers at all
- **Case Sensitive**: Enum values must match exactly: `'cane'`, `'light walker'`, `'roll-leader'`
- **Array Field**: `cannot_handle_mobility_devices` is an array, so drivers can have multiple limitations
- **Optional**: If not set, defaults to empty array (driver can handle all devices)
- **Client Field**: The client's `mobility_assistance_enum` is a single value, not an array

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Can set driver limitations in Admin UI
- [ ] Limitations save correctly
- [ ] Limitations display correctly in view mode
- [ ] Backend API excludes drivers correctly
- [ ] Excluded drivers show proper exclusion reason
- [ ] Drivers without limitations still match all clients

