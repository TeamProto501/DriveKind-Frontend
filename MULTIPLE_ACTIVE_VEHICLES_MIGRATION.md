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

### Completed (Frontend):
1. ✅ Removed single active vehicle restriction in driver vehicles page
2. ✅ Removed single active vehicle restriction in admin vehicle management
3. ✅ Updated set-active endpoint to toggle instead of deactivating others
4. ✅ Updated driver rides page to load active vehicles and calculate eligible vehicles
5. ✅ Added vehicle selection UI when driver has multiple eligible vehicles
6. ✅ Updated acceptRide to require vehicle selection and send vehicle_id to backend
7. ✅ Show eligible vehicles count in ride card
8. ✅ Updated ride queries to include `assigned_vehicle` and vehicle details (via Supabase join)
9. ✅ Display assigned vehicle in driver ride cards throughout lifecycle

### Pending (Backend API):
10. ⏳ Update `/rides/:rideId/accept` endpoint to accept `vehicle_id` in request body
11. ⏳ Update `/rides/:rideId/accept` endpoint to save `assigned_vehicle` to database
12. ⏳ Update ride matching logic (backend) to check if driver has at least one eligible active vehicle
13. ⏳ Update ride display in dispatcher/admin views to show assigned vehicle

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

