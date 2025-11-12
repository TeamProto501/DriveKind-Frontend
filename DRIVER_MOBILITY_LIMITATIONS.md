# Driver Mobility Limitations Feature

## Overview
This feature adds the ability to specify which mobility devices a driver cannot handle. This information is used as a **hard filter** in ride matching - drivers will be excluded from rides where the client uses a mobility device that the driver cannot handle.

## Database Schema

### Migration
The migration file `database/migrations/add_driver_mobility_limitations.sql` adds:

1. **Enum Type**: `mobility_assistance_enum` with values:
   - `'cane'`
   - `'light walker'`
   - `'roll-leader'`

2. **Column**: `cannot_handle_mobility_devices` on `staff_profiles` table
   - Type: `mobility_assistance_enum[]` (array of enum values)
   - Default: Empty array `ARRAY[]::mobility_assistance_enum[]`
   - Purpose: Stores which mobility devices the driver cannot handle

### Applying the Migration

**Important**: Apply this migration to your actual database:

```sql
-- Run this migration on your actual database
-- File: database/migrations/add_driver_mobility_limitations.sql
```

## Frontend Implementation

### User Management UI
- **Location**: `src/routes/admin/users/UserSidebar.svelte`
- **Step 3** of the user creation/edit wizard includes:
  - Checkboxes for each mobility device type
  - Only shown for users with Driver role
  - Allows selecting multiple devices the driver cannot handle

### Field Details
- **Field Name**: `cannot_handle_mobility_devices`
- **Type**: `string[]` (array of enum values)
- **Values**: `["cane", "light walker", "roll-leader"]`
- **Display**: Shows as comma-separated list in view mode (e.g., "Cane, Light walker")

## Backend API Integration

### Required Changes to Ride Matching API

The ride matching endpoint (`POST /rides/:rideId/match-drivers`) needs to implement the hard filter logic:

#### 1. Fetch Driver Limitations
When querying drivers for matching, include the `cannot_handle_mobility_devices` field:

```sql
SELECT 
  user_id,
  first_name,
  last_name,
  cannot_handle_mobility_devices,
  -- ... other fields
FROM staff_profiles
WHERE role @> ARRAY['Driver']::text[]
  AND org_id = :org_id
```

#### 2. Fetch Client Mobility Device
When fetching the ride/client information, get the client's `mobility_assistance_enum`:

```sql
SELECT 
  r.ride_id,
  c.mobility_assistance_enum,
  -- ... other fields
FROM rides r
JOIN clients c ON r.client_id = c.client_id
WHERE r.ride_id = :ride_id
```

#### 3. Hard Filter Logic
**Exclude drivers** where the client's mobility device is in the driver's `cannot_handle_mobility_devices` array:

```typescript
// Pseudocode
const clientMobilityDevice = ride.client.mobility_assistance_enum;

const availableDrivers = allDrivers.filter(driver => {
  // Hard filter: exclude if client's device is in driver's cannot_handle list
  if (clientMobilityDevice && driver.cannot_handle_mobility_devices) {
    if (driver.cannot_handle_mobility_devices.includes(clientMobilityDevice)) {
      return false; // EXCLUDE this driver
    }
  }
  return true; // Include this driver
});
```

#### 4. Exclusion Reason
When excluding a driver, add a clear exclusion reason:

```typescript
if (driver.cannot_handle_mobility_devices.includes(clientMobilityDevice)) {
  excludedDrivers.push({
    ...driver,
    match_quality: 'excluded',
    exclusion_reasons: [
      `Driver cannot handle ${clientMobilityDevice} mobility devices`
    ]
  });
  continue; // Skip to next driver
}
```

### Example Implementation

```typescript
// Example Node.js/TypeScript implementation
async function matchDrivers(rideId: number, orgId: number) {
  // 1. Get ride with client info
  const ride = await db.query(`
    SELECT r.*, c.mobility_assistance_enum
    FROM rides r
    JOIN clients c ON r.client_id = c.client_id
    WHERE r.ride_id = $1 AND r.org_id = $2
  `, [rideId, orgId]);

  const clientMobilityDevice = ride.mobility_assistance_enum;

  // 2. Get all drivers for the organization
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
    // HARD FILTER: Check if driver cannot handle client's mobility device
    if (clientMobilityDevice && driver.cannot_handle_mobility_devices) {
      if (driver.cannot_handle_mobility_devices.includes(clientMobilityDevice)) {
        excluded.push({
          ...driver,
          match_quality: 'excluded',
          exclusion_reasons: [
            `Driver cannot handle ${clientMobilityDevice} mobility devices`
          ]
        });
        continue; // Skip this driver
      }
    }

    // Continue with normal matching logic...
    available.push({
      ...driver,
      match_quality: 'excellent', // or calculate based on other factors
      reasons: ['Available driver']
    });
  }

  return { available, excluded };
}
```

## Testing

### Test Cases

1. **Driver with no limitations** should match all clients
2. **Driver who cannot handle "cane"** should be excluded from rides with clients using cane
3. **Driver who cannot handle "light walker"** should be excluded from rides with clients using light walker
4. **Driver who cannot handle "roll-leader"** should be excluded from rides with clients using roll-leader
5. **Client with no mobility device** should match all drivers
6. **Multiple limitations** - driver with multiple cannot_handle values should be excluded from all matching clients

### Manual Testing Steps

1. Create/edit a driver in Admin > Users
2. In Step 3, select one or more mobility devices the driver cannot handle
3. Save the driver profile
4. Create a ride for a client with a mobility device that matches the driver's limitation
5. Use "Send Ride Request" - the driver should appear in "Excluded Drivers" with the reason
6. Create a ride for a client with a different mobility device - the driver should appear in "Available Drivers"

## Notes

- This is a **hard filter** - drivers matching the criteria are completely excluded, not just scored lower
- The field is optional - if not set, it defaults to an empty array (driver can handle all devices)
- The enum values must match exactly: `'cane'`, `'light walker'`, `'roll-leader'` (case-sensitive)
- The client's `mobility_assistance_enum` field should be a single value, not an array
- The driver's `cannot_handle_mobility_devices` is an array, allowing multiple limitations

