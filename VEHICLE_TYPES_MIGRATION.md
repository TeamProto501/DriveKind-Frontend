# Vehicle Types Migration Guide

## Overview
Replace the hardcoded vehicle enum with a dynamic array-based system stored in the `organization` table. This allows each organization to customize their vehicle types with any text values they want.

## Database Changes (Supabase)

### Step 1: Update existing vehicles with Motorcycle type

First, update existing vehicles that use Motorcycle:

```sql
-- Update vehicles with Motorcycle to another type (e.g., Truck)
UPDATE public.vehicles 
SET type_of_vehicle_enum = 'Truck'::type_of_vehicle_enum 
WHERE type_of_vehicle_enum = 'Motorcycle';
```

### Step 2: Change enum column to TEXT

Convert the `type_of_vehicle_enum` column from enum to TEXT:

```sql
-- Step 1: Add a new TEXT column
ALTER TABLE public.vehicles 
ADD COLUMN type_of_vehicle TEXT;

-- Step 2: Copy data from enum to TEXT column
UPDATE public.vehicles 
SET type_of_vehicle = type_of_vehicle_enum::text;

-- Step 3: Drop the old enum column
ALTER TABLE public.vehicles 
DROP COLUMN type_of_vehicle_enum;

-- Step 4: Rename the new column to the original name
ALTER TABLE public.vehicles 
RENAME COLUMN type_of_vehicle TO type_of_vehicle_enum;

-- Step 5: (Optional) Drop the old enum type if no longer needed
-- DROP TYPE type_of_vehicle_enum;
```

### Step 3: Add `vehicle_types` column to `organization` table

The `vehicle_types` array will contain the available vehicle types for that organization:

```sql
-- Add vehicle_types column as TEXT array
ALTER TABLE public.organization 
ADD COLUMN IF NOT EXISTS vehicle_types TEXT[] DEFAULT ARRAY['SUV', 'Sedan', 'Van', 'Truck', 'Coupe']::TEXT[];

-- Update existing organizations with default vehicle types (excluding Motorcycle)
UPDATE public.organization 
SET vehicle_types = ARRAY['SUV', 'Sedan', 'Van', 'Truck', 'Coupe']::TEXT[]
WHERE vehicle_types IS NULL;
```

**Important Notes:**
- The `type_of_vehicle_enum` column in the `vehicles` table is now a TEXT column (not an enum)
- Admins can add/remove/edit any vehicle types - they are not restricted to specific values
- The `vehicle_types` array in `organization` controls which vehicle types are available for that organization
- When creating/editing vehicles, users can only select from the organization's `vehicle_types` array

## Code Changes

### Files Modified:
1. `src/routes/admin/vehicle_management/+page.server.ts` - Load vehicle_types from org, add updateVehicleTypes action, remove enum validation
2. `src/routes/admin/vehicle_management/+page.svelte` - Add UI for managing vehicle types (free-form text), use org vehicle_types
3. `src/routes/driver/vehicles/+page.server.ts` - Load vehicle_types from org
4. `src/routes/driver/vehicles/+page.svelte` - Use org vehicle_types instead of hardcoded array
5. `src/routes/driver/vehicles/create/+server.ts` - Validate against org vehicle_types (no enum validation)
6. `src/routes/driver/vehicles/update/[vehicleId]/+server.ts` - Validate against org vehicle_types (no enum validation)

### Key Changes:
- Remove all enum type definitions and validations
- Remove "Motorcycle" from all type definitions
- Load `vehicle_types` from organization in server load functions
- Add CRUD operations for vehicle types in admin vehicle management page (free-form text input)
- Validate vehicle type selections against organization's `vehicle_types` array only
- Use `getUser()` instead of `getSession()` for secure authentication
- Allow admins to add any text as a vehicle type (no enum restrictions)

## Testing Checklist

- [ ] Database column changed from enum to TEXT
- [ ] Database column added successfully
- [ ] Existing organizations have default vehicle_types
- [ ] Admin can view vehicle types in vehicle management page
- [ ] Admin can add new vehicle types (any text)
- [ ] Admin can remove vehicle types (with validation if vehicles use that type)
- [ ] Admin can edit vehicle type names (any text)
- [ ] Driver vehicle creation uses organization's vehicle_types
- [ ] Driver vehicle editing uses organization's vehicle_types
- [ ] Admin vehicle creation uses organization's vehicle_types
- [ ] Admin vehicle editing uses organization's vehicle_types
- [ ] "Motorcycle" is removed from all dropdowns
- [ ] Validation prevents using vehicle types not in organization's list
- [ ] No enum validation errors occur
