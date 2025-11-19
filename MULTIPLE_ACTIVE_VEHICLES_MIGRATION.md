# Multiple Active Vehicles Migration Guide

## Overview
This migration allows drivers to have multiple active vehicles simultaneously and updates the ride matching/acceptance flow to support vehicle selection.

## Database Changes (Supabase)

### Step 1: Add `assigned_vehicle` column to rides table

```sql
-- Add assigned_vehicle column to rides table
ALTER TABLE public.rides 
ADD COLUMN assigned_vehicle INTEGER REFERENCES public.vehicles(vehicle_id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_rides_assigned_vehicle ON public.rides(assigned_vehicle);

-- Add comment for documentation
COMMENT ON COLUMN public.rides.assigned_vehicle IS 'The vehicle chosen by the driver for this ride. Set when driver accepts the ride if they have multiple eligible vehicles.';
```

## Code Changes Summary

### Completed:
1. ✅ Removed single active vehicle restriction in driver vehicles page
2. ✅ Removed single active vehicle restriction in admin vehicle management
3. ✅ Updated set-active endpoint to toggle instead of deactivating others

### In Progress:
4. ⏳ Update ride matching logic to check if at least one active vehicle works
5. ⏳ Update ride request to show eligible vehicles to driver
6. ⏳ Add vehicle selection UI when driver has multiple eligible vehicles
7. ⏳ Update ride acceptance to save assigned_vehicle
8. ⏳ Update ride display to show assigned vehicle throughout lifecycle

## Ride Matching Logic Changes

### Current Behavior:
- Driver is eligible if they have at least one active vehicle
- Need to check which vehicles work for the ride (based on ride requirements)

### New Behavior:
- Driver is eligible if at least one of their active vehicles works for the ride
- When sending ride request to driver, include list of eligible vehicles
- If driver has multiple eligible vehicles, they must select one before accepting
- The selected vehicle is stored in `rides.assigned_vehicle`
- The assigned vehicle is shown throughout the ride lifecycle

## Vehicle Eligibility Criteria

A vehicle is eligible for a ride if:
1. Vehicle is active (`active = true`)
2. Vehicle belongs to the driver
3. Vehicle meets ride requirements (to be determined based on existing logic)

## Testing Checklist

- [ ] Database column added successfully
- [ ] Driver can activate multiple vehicles
- [ ] Driver can deactivate vehicles independently
- [ ] Ride matching shows drivers with at least one eligible vehicle
- [ ] Ride request shows eligible vehicles to driver
- [ ] Driver can select vehicle when multiple are eligible
- [ ] Driver must select vehicle before accepting (if multiple eligible)
- [ ] Assigned vehicle is saved to database
- [ ] Assigned vehicle is displayed in ride details
- [ ] Assigned vehicle is shown throughout ride lifecycle

