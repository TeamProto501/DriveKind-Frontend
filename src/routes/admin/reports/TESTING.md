# Testing the Reports Page

## Prerequisites

Before testing the reports page, ensure you have:

1. **Completed Rides**: At least a few rides with `status='Completed'` in the `rides` table
2. **Completion Data**: The rides should have:
   - `hours` field populated
   - `miles_driven` field populated
   - `donation_amount` field (optional)
   - `driver_user_id` linked to a staff member with 'Driver' role
   - `client_id` linked to a client

## Sample Data Setup

If you need test data, run this SQL in your Supabase SQL Editor:

```sql
-- Check existing rides
SELECT 
  ride_id, 
  status, 
  driver_user_id, 
  client_id,
  hours,
  miles_driven
FROM rides 
WHERE status = 'Completed'
LIMIT 5;

-- If you need to update a ride to add completion data
UPDATE rides 
SET 
  status = 'Completed',
  hours = 2.0,
  miles_driven = 15.5,
  donation_amount = 25.00,
  completion_status = 'Completed Round Trip'
WHERE ride_id = 1;  -- Replace with your ride_id

-- Check staff profiles (drivers)
SELECT user_id, first_name, last_name, role
FROM staff_profiles
WHERE 'Driver' = ANY(role)
LIMIT 5;

-- Check clients
SELECT client_id, first_name, last_name
FROM clients
LIMIT 5;
```

## Test Cases

### Test 1: Generate Driver Report
1. Navigate to `/admin/reports`
2. Select "By Driver" radio button
3. Choose a driver from the dropdown
4. Click "Generate Report"
5. **Expected**: Table shows all completed rides for that driver with hours/miles

### Test 2: Generate Organization Report
1. Select "Whole Organization" radio button
2. Click "Generate Report"
3. **Expected**: Table shows ALL completed rides in the organization

### Test 3: Date Range Filtering
1. Select a report type and entity
2. Set "From" date to last week
3. Set "To" date to today
4. Click "Generate Report"
5. **Expected**: Only rides within date range appear

### Test 4: End of Day Report
1. Select "By Driver" and choose a driver
2. Click "End of Day" button
3. **Expected**: Only today's completed rides appear

### Test 5: Search Functionality
1. Generate any report with results
2. Type a driver name in the search box
3. **Expected**: Table filters to matching rides in real-time

### Test 6: Driver Filter
1. Generate an organization report
2. Use the "Driver" dropdown filter
3. **Expected**: Table shows only rides for selected driver

### Test 7: Column Sorting
1. Generate any report with results
2. Click "Hours" column header
3. **Expected**: Rides sort by hours ascending
4. Click again
5. **Expected**: Rides sort by hours descending

### Test 8: Export CSV
1. Generate any report with results
2. Click "Export CSV" button
3. **Expected**: CSV file downloads with all ride data

### Test 9: Summary Metrics
1. Generate any report
2. Check the summary card on the right
3. **Expected**: 
   - Total Hours = sum of all ride hours
   - Total Miles = sum of all miles
   - Total Donations = sum of all donations
   - Average Hours = total hours / number of rides
   - Ride count matches table rows

### Test 10: Empty Results
1. Select a driver with no completed rides
2. Click "Generate Report"
3. **Expected**: Message "No completed rides found"

## Common Issues

### Issue: "No completed rides found"
**Solution**: Ensure you have:
- Rides with `status = 'Completed'`
- Hours and miles data populated in the rides table
- The driver_user_id/client_id matches what you selected

### Issue: Hours showing as "0 hrs"
**Solution**: Check that `rides.hours` is not NULL or 0

### Issue: Driver names showing as "Unknown Driver"
**Solution**: Verify:
- Driver has a staff_profiles record
- Staff profile has first_name and last_name
- Staff profile has 'Driver' in the role array
- rides.driver_user_id matches staff_profiles.user_id

### Issue: "Failed to load drivers"
**Solution**: Check RLS policies on the staff_profiles and clients tables

## SQL Queries for Debugging

```sql
-- Check completed rides count
SELECT COUNT(*) FROM rides WHERE status = 'Completed';

-- Check rides with completion data
SELECT 
  ride_id,
  status,
  driver_user_id,
  client_id,
  hours,
  miles_driven,
  donation_amount,
  completion_status
FROM rides
WHERE status = 'Completed'
LIMIT 10;

-- Check driver-staff linkage
SELECT 
  sp.user_id,
  sp.first_name,
  sp.last_name,
  sp.role,
  COUNT(r.ride_id) as ride_count
FROM staff_profiles sp
LEFT JOIN rides r ON sp.user_id = r.driver_user_id AND r.status = 'Completed'
WHERE 'Driver' = ANY(sp.role)
GROUP BY sp.user_id, sp.first_name, sp.last_name, sp.role
LIMIT 10;

-- Check client data with ride counts
SELECT 
  c.client_id,
  c.first_name,
  c.last_name,
  COUNT(r.ride_id) as completed_rides
FROM clients c
LEFT JOIN rides r ON c.client_id = r.client_id AND r.status = 'Completed'
GROUP BY c.client_id, c.first_name, c.last_name
LIMIT 10;
```

## Expected Behavior Summary

✅ **Working correctly if:**
- Reports generate without errors
- Summary metrics calculate correctly
- Table displays ride data
- Search and filters work
- CSV export downloads
- Sorting changes table order
- Date filters limit results

❌ **Issues if:**
- "Failed to fetch rides data" error
- Summary card shows all zeros
- Table is empty despite completed rides
- Search doesn't filter
- Export button does nothing

## Performance Notes

- Large organizations with 1000+ rides may take a few seconds to load
- Consider adding pagination if you have >500 rides
- Date range filtering helps limit query size

## Next: Adding to Navigation

After testing, add the reports link to your admin menu:

```typescript
// In your navigation config
{
  label: 'Reports',
  href: '/admin/reports',
  icon: FileTextIcon,
  roles: ['Super Admin', 'Admin', 'Dispatcher']
}
```

Happy testing! 🧪
