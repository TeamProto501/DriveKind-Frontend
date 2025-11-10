# Reports Page - Driver Hours Tracking

## Overview
The Reports page is designed to track and analyze volunteer driver hours for the DriveKind program. Unlike typical financial tracking systems, this page focuses on volunteer hours as the primary metric, along with miles driven and donations received.

## Features

### 1. **Multiple Report Types**
- **By Driver**: Generate reports for individual drivers to track their volunteer hours
- **By Client**: View rides completed for specific clients
- **By Organization**: See all completed rides across the entire organization

### 2. **Date Range Filtering**
- Filter reports by date range (from/to dates)
- Quick "End of Day" button for daily reports
- Optional date filtering - leave blank to see all completed rides

### 3. **Summary Metrics**
The summary card displays:
- **Total Volunteer Hours**: Primary metric showing cumulative hours
- **Total Miles Driven**: Distance covered by volunteers
- **Total Donations**: Sum of all donations received
- **Average Hours**: Average hours per ride
- **Ride Count**: Number of completed rides

### 4. **Interactive Data Table**
- **Search**: Filter rides by driver, client, pickup, or dropoff address
- **Driver Filter**: Dropdown to filter by specific driver
- **Sortable Columns**: Click column headers to sort by:
  - Date
  - Driver Name
  - Client Name
  - Hours
  - Miles
  - Donation Amount

### 5. **Export Functionality**
- **CSV Export**: Download report data as CSV for further analysis in Excel/Sheets

## Database Schema

### Tables Used
1. **rides**: Main rides table with all ride and completion data including:
   - `appointment_time`: Scheduled appointment time
   - `pickup_time`: When pickup occurred
   - `hours`: Duration in hours (entered by driver on completion)
   - `miles_driven`: Miles traveled
   - `donation_amount`: Any donation received
   - `completion_status`: How the ride was completed (Round Trip, One Way, Cancelled, etc.)
   - `status`: Current ride status (Completed, Cancelled, etc.)
   - `driver_user_id`: UUID reference to staff_profiles
   - `client_id`: Integer reference to clients table

2. **staff_profiles**: Staff information with role array
   - Drivers have 'Driver' in their `role` array
   - Dispatchers have 'Dispatcher' in their `role` array
   - Contains first_name, last_name, email, etc.

3. **clients**: Client information
   - Contains first_name, last_name, contact info, etc.

## How It Works

### Data Flow
1. User selects report type (driver/client/organization)
2. User selects specific entity (unless organization-wide)
3. Optionally adds date range filters
4. Clicks "Generate Report"
5. Server queries `rides` table with `status='Completed'`
6. Joins with `staff_profiles` to get driver and dispatcher names
7. Joins with `clients` to get client names
8. Returns filtered results to frontend
9. Frontend displays data in table and calculates summary metrics

### Calculations
- **Total Hours**: Sum of all `rides.hours` for completed rides
- **Total Miles**: Sum of all `rides.miles_driven`
- **Total Donations**: Sum of all `rides.donation_amount`
- **Average Hours**: Total Hours / Number of Rides

## File Structure
```
src/routes/admin/reports/
├── +page.server.ts    # Server-side data loading and API endpoints
├── +page.svelte       # Main UI component
└── REPORTS_README.md  # This file
```

## Usage Guide

### For Administrators
1. Navigate to Admin → Reports
2. Choose report type:
   - **By Driver**: To track individual volunteer hours
   - **By Client**: To see rides for a specific client
   - **Whole Organization**: For comprehensive reports

3. Select the specific driver/client (if applicable)
4. (Optional) Set date range for focused reporting
5. Click "Generate Report"
6. Review summary metrics in the card
7. Use search/filters to find specific rides
8. Export to CSV if needed for external analysis

### End of Day Reports
The "End of Day" button is a quick shortcut that:
- Sets both From and To dates to today
- Generates a report for the current day
- Useful for daily volunteer hour tracking

## Technical Details

### API Endpoints
- **POST /admin/reports?/fetchRides**: Fetches ride data based on filters

### Request Parameters
- `filterType`: 'driver' | 'client' | 'organization'
- `selectedId`: UUID of selected driver or client_id of client (or 'all' for organization)
- `fromDate`: Start date (optional)
- `toDate`: End date (optional)

### Response Data
Returns array of rides with:
```typescript
{
  ride_id: number
  client_name: string
  driver_name: string
  dispatcher_name: string
  appointment_time: string
  pickup_time: string | null
  hours: number
  miles_driven: number
  donation_amount: number
  completion_status: string
  purpose: string
  alt_pickup_address: string | null
  destination_name: string
  dropoff_address: string
  // ... other fields
}
```

## Future Enhancements
Potential improvements:
- PDF export with formatted layout
- Charts/graphs for visual analysis
- Month-over-month comparisons
- Top volunteer drivers leaderboard
- Mileage reimbursement calculations
- Time of day analysis (peak hours)
- Route efficiency metrics

## Permissions
This page should be accessible to:
- Super Admin
- Admin
- Dispatcher (view only)

Ensure proper role guards are in place in the layout/routing configuration.
