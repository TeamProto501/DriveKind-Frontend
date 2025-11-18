# Vehicle Types Migration Guide

## Overview
Keep the `type_of_vehicle_enum` enum in the database, but:
- Remove 'Motorcycle' from the enum definition
- Add `vehicle_types` array to `organization` table to control which enum values are available for each organization
- Allow admins to add/remove enum values from their organization's available vehicle types

## Database Changes (Supabase)

### Step 1: Update the enum to remove Motorcycle

First, update existing vehicles that use Motorcycle, then modify the enum:

```sql
-- Step 1: Update existing vehicles with Motorcycle type to another type
UPDATE public.vehicles 
SET type_of_vehicle_enum = 'Truck'::type_of_vehicle_enum 
WHERE type_of_vehicle_enum = 'Motorcycle';

-- Step 2: Drop and recreate the enum without Motorcycle
-- Note: This requires dropping dependent objects first
ALTER TYPE type_of_vehicle_enum RENAME TO type_of_vehicle_enum_old;

CREATE TYPE type_of_vehicle_enum AS ENUM ('SUV', 'Sedan', 'Van', 'Truck', 'Coupe');

-- Step 3: Update the vehicles table to use the new enum
ALTER TABLE public.vehicles 
  ALTER COLUMN type_of_vehicle_enum TYPE type_of_vehicle_enum 
  USING type_of_vehicle_enum::text::type_of_vehicle_enum;

-- Step 4: Drop the old enum
DROP TYPE type_of_vehicle_enum_old;
```

### Step 2: Add `vehicle_types` column to `organization` table

The `vehicle_types` array will contain which enum values are available for that organization:

```sql
-- Add vehicle_types column as TEXT array
ALTER TABLE public.organization 
ADD COLUMN IF NOT EXISTS vehicle_types TEXT[] DEFAULT ARRAY['SUV', 'Sedan', 'Van', 'Truck', 'Coupe']::TEXT[];

-- Update existing organizations with default vehicle types (all enum values except Motorcycle)
UPDATE public.organization 
SET vehicle_types = ARRAY['SUV', 'Sedan', 'Van', 'Truck', 'Coupe']::TEXT[]
WHERE vehicle_types IS NULL;
```

**Important Notes:**
- The `type_of_vehicle_enum` column in the `vehicles` table remains as an enum type
- The enum values are: 'SUV', 'Sedan', 'Van', 'Truck', 'Coupe' (Motorcycle removed)
- The `vehicle_types` array in `organization` controls which enum values are available/active for that organization
- Admins can add/remove enum values from the array, but they can only choose from valid enum values
- When adding a new vehicle type, it must be a valid enum value

## Code Changes

### Files to Modify:
1. `src/routes/admin/vehicle_management/+page.server.ts` - Load vehicle_types from org, add updateVehicleTypes action, validate enum values
2. `src/routes/admin/vehicle_management/+page.svelte` - Add UI for managing vehicle types, use org vehicle_types, validate against enum
3. `src/routes/driver/vehicles/+page.server.ts` - Load vehicle_types from org
4. `src/routes/driver/vehicles/+page.svelte` - Use org vehicle_types instead of hardcoded array
5. `src/routes/driver/vehicles/create/+server.ts` - Validate against org vehicle_types and enum
6. `src/routes/driver/vehicles/update/[vehicleId]/+server.ts` - Validate against org vehicle_types and enum

### Key Changes:
- Remove hardcoded `VEHICLE_TYPES` arrays
- Remove "Motorcycle" from all type definitions
- Load `vehicle_types` from organization in server load functions
- Add CRUD operations for vehicle types in admin vehicle management page
- Validate that vehicle types added by admins are valid enum values
- Validate vehicle type selections against organization's `vehicle_types` array
- Use `getUser()` instead of `getSession()` for secure authentication

## Valid Enum Values

The enum can only contain these values:
- 'SUV'
- 'Sedan'
- 'Van'
- 'Truck'
- 'Coupe'

Admins can choose which of these enum values are available for their organization via the `vehicle_types` array.

## Testing Checklist

- [ ] Enum updated to remove Motorcycle
- [ ] Database column added successfully
- [ ] Existing organizations have default vehicle_types
- [ ] Admin can view vehicle types in vehicle management page
- [ ] Admin can add enum values to vehicle_types array
- [ ] Admin can remove enum values from vehicle_types array (with validation if vehicles use that type)
- [ ] Admin cannot add invalid enum values (only SUV, Sedan, Van, Truck, Coupe)
- [ ] Driver vehicle creation uses organization's vehicle_types
- [ ] Driver vehicle editing uses organization's vehicle_types
- [ ] Admin vehicle creation uses organization's vehicle_types
- [ ] Admin vehicle editing uses organization's vehicle_types
- [ ] "Motorcycle" is removed from all dropdowns
- [ ] Validation prevents using vehicle types not in organization's list
