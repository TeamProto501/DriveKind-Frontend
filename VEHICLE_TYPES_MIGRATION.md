# Vehicle Types Migration Guide

## Overview
Replace the hardcoded vehicle enum with a dynamic table-based system. Create a separate `vehicle_types` table where each organization can have their own vehicle types.

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

### Step 3: Create vehicle_types table

Create a new table to store vehicle types for each organization:

```sql
-- Create vehicle_types table
CREATE TABLE public.vehicle_types (
  vehicle_type_id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES public.organization(org_id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, type_name)
);

-- Create index for faster lookups
CREATE INDEX idx_vehicle_types_org_id ON public.vehicle_types(org_id);

-- Add RLS policies (if using RLS)
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view vehicle types for their organization
CREATE POLICY "Users can view vehicle types for their org"
  ON public.vehicle_types
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.staff_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage vehicle types for their organization
CREATE POLICY "Admins can manage vehicle types for their org"
  ON public.vehicle_types
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.staff_profiles 
      WHERE user_id = auth.uid() 
      AND (role @> ARRAY['Admin']::text[] OR role @> ARRAY['Super Admin']::text[])
    )
  );
```

### Step 4: Populate vehicle_types table with default values

```sql
-- Insert default vehicle types for all existing organizations
INSERT INTO public.vehicle_types (org_id, type_name)
SELECT 
  org_id,
  unnest(ARRAY['SUV', 'Sedan', 'Van', 'Truck', 'Coupe']::TEXT[]) as type_name
FROM public.organization
ON CONFLICT (org_id, type_name) DO NOTHING;
```

## Code Changes

### Files to Modify:
1. `src/routes/admin/vehicle_management/+page.server.ts` - Load vehicle_types from table, add CRUD actions
2. `src/routes/admin/vehicle_management/+page.svelte` - Update UI to use table-based vehicle types
3. `src/routes/driver/vehicles/+page.server.ts` - Load vehicle_types from table
4. `src/routes/driver/vehicles/+page.svelte` - Use table-based vehicle_types
5. `src/routes/driver/vehicles/create/+server.ts` - Validate against vehicle_types table
6. `src/routes/driver/vehicles/update/[vehicleId]/+server.ts` - Validate against vehicle_types table

### Key Changes:
- Remove `vehicle_types` array from organization table
- Load vehicle types from `vehicle_types` table
- Add vehicle type = INSERT into `vehicle_types` table
- Remove vehicle type = DELETE from `vehicle_types` table
- Edit vehicle type = UPDATE `vehicle_types` table
- Validate vehicle type selections against `vehicle_types` table

## Testing Checklist

- [ ] Database table created successfully
- [ ] Default vehicle types inserted for all organizations
- [ ] Admin can view vehicle types in vehicle management page
- [ ] Admin can add new vehicle types (inserts into table)
- [ ] Admin can remove vehicle types (deletes from table, with validation if vehicles use that type)
- [ ] Admin can edit vehicle type names (updates table)
- [ ] Driver vehicle creation uses organization's vehicle_types from table
- [ ] Driver vehicle editing uses organization's vehicle_types from table
- [ ] Admin vehicle creation uses organization's vehicle_types from table
- [ ] Admin vehicle editing uses organization's vehicle_types from table
- [ ] "Motorcycle" is removed from all dropdowns
- [ ] Validation prevents using vehicle types not in organization's list
- [ ] RLS policies work correctly
