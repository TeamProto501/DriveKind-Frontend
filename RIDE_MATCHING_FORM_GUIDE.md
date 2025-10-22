# Ride Matching Form - Implementation Guide

## Overview
A comprehensive form component for dispatchers to create new rides with complete client information and special requirements.

## Files Created

### 1. **RideMatchingForm Component**
**Location**: `src/lib/components/RideMatchingForm.svelte`

A fully-featured form component that collects:

#### Client Information
- ✅ First Name (required)
- ✅ Last Name (required)
- ✅ Street Address (required)
- ✅ Address 2 (optional)
- ✅ ZIP Code (required)
- ✅ City (required)
- ✅ State (required)

#### Special Requirements
- ✅ Mobility Assistance (dropdown: Wheelchair, Walker, Cane, Crutches, Other)
- ✅ Other Limitations (textarea)
- ✅ Car Height Needed (checkbox for wheelchair vehicles)
- ✅ Service Animal (checkbox)
- ✅ Oxygen Required (checkbox)
- ✅ Allergies (textarea)

#### Ride Details - Pickup Location
- ✅ Option to use client's home address
- ✅ Alternative pickup address fields (if not using home address)
- ✅ Pickup City, State, ZIP

#### Ride Details - Dropoff Location
- ✅ Destination Name (e.g., Hospital, Clinic)
- ✅ Dropoff Street Address (required)
- ✅ Dropoff Address 2 (optional)
- ✅ Dropoff City (required)
- ✅ Dropoff State (required)
- ✅ Dropoff ZIP (required)

#### Schedule & Additional Details
- ✅ Ride Date (required)
- ✅ Ride Time (required)
- ✅ Number of Riders
- ✅ Estimated Duration (minutes)
- ✅ Round Trip (checkbox)
- ✅ Purpose (dropdown: Medical, Shopping, Social, Religious, Work, Other)
- ✅ Additional Notes (textarea)

### 2. **Server Endpoint**
**Location**: `src/routes/dispatcher/rides/create-with-client/+server.ts`

Handles form submission with the following logic:

1. **Authentication & Authorization**
   - Verifies user is logged in
   - Checks for Dispatcher or Admin role
   - Gets organization ID

2. **Client Management**
   - Searches for existing client by name and org
   - If found: Updates special requirements
   - If not found: Creates new client profile

3. **Ride Creation**
   - Creates ride with all details
   - Links to client
   - Sets status to "Requested"
   - Stores all special requirements

4. **Response**
   - Returns ride data
   - Returns client ID
   - Includes success message

### 3. **Integration Page**
**Location**: `src/routes/dispatcher/rides/new/+page.svelte`

A complete page that:
- Displays the RideMatchingForm component
- Handles form submission
- Shows loading states
- Displays success/error messages
- Redirects to rides list after success

## How to Use

### For Dispatchers

1. Navigate to `/dispatcher/rides/new`
2. Fill in all required client information
3. Add special requirements as needed
4. Enter ride details (pickup/dropoff, date/time)
5. Click "Create Ride & Find Drivers"
6. System will:
   - Create or update client profile
   - Create the ride request
   - Redirect to rides list

### Integration into Existing Rides Page

To add a "New Ride" button to the existing dispatcher rides page:

```svelte
<!-- In src/routes/dispatcher/rides/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<!-- Add this button to the top of the page -->
<Button onclick={() => goto('/dispatcher/rides/new')}>
  <Plus class="w-4 h-4 mr-2" />
  New Ride (Full Form)
</Button>
```

## Features

### Smart Pickup Address
- Checkbox to use client's home address as pickup
- Automatically populates pickup fields when checked
- Can override with custom pickup location

### Form Validation
- All required fields marked with red asterisk (*)
- Real-time validation on submit
- Clear error messages below invalid fields
- Prevents submission until all required fields are filled

### Responsive Design
- Mobile-friendly layout
- Grid system adapts to screen size
- Touch-friendly inputs

### Special Requirements Tracking
All special requirements are stored in the client profile:
- Mobility assistance needs
- Vehicle height requirements
- Service animal accommodation
- Oxygen equipment
- Allergy information

This data can be used for:
- Driver matching algorithms
- Vehicle selection
- Route planning
- Special instructions

## Database Schema

### Tables Used

#### `client_profiles`
```sql
- client_id (primary key)
- org_id
- first_name
- last_name
- street_address
- address2
- city
- state
- zipcode
- mobility_assistance
- other_limitations
- car_height_needed
- service_animal
- oxygen
- allergies
```

#### `rides`
```sql
- ride_id (primary key)
- org_id
- client_id (foreign key)
- dispatcher_user_id
- purpose
- destination_name
- dropoff_address
- dropoff_address2
- dropoff_city
- dropoff_state
- dropoff_zipcode
- appointment_time
- pickup_from_home
- alt_pickup_address
- alt_pickup_address2
- alt_pickup_city
- alt_pickup_state
- alt_pickup_zipcode
- round_trip
- riders
- estimated_appointment_length
- notes
- status
```

## Next Steps

### Recommended Enhancements

1. **Driver Matching Algorithm**
   - Create endpoint: `/dispatcher/rides/[rideId]/match/+server.ts`
   - Calculate driver scores based on:
     - Vehicle capacity vs. riders
     - Wheelchair accessibility vs. car_height_needed
     - Proximity to pickup location
     - Current availability
     - Existing ride assignments

2. **Client Search/Autocomplete**
   - Add autocomplete to find existing clients
   - Pre-fill form with client data
   - Reduce duplicate client entries

3. **Address Validation**
   - Integrate Google Maps API
   - Validate addresses in real-time
   - Calculate estimated distance/duration

4. **Recurring Rides**
   - Add option for recurring appointments
   - Weekly/monthly patterns
   - Bulk ride creation

5. **Driver Assignment UI**
   - Show suggested drivers after ride creation
   - One-click assignment
   - Driver availability calendar

## API Usage

### Create Ride with Client

```typescript
// POST /dispatcher/rides/create-with-client
const response = await fetch('/dispatcher/rides/create-with-client', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // Client Info
    firstName: "John",
    lastName: "Doe",
    streetAddress: "123 Main St",
    address2: "Apt 4B",
    city: "Springfield",
    state: "IL",
    zip: "62701",
    
    // Special Requirements
    mobilityAssistance: "Wheelchair",
    carHeightNeeded: true,
    serviceAnimal: false,
    oxygen: true,
    allergies: "Peanuts, latex",
    otherLimitations: "Needs assistance with door",
    
    // Ride Details
    useClientAddress: true,
    dropoffAddress: "456 Hospital Dr",
    dropoffCity: "Springfield",
    dropoffState: "IL",
    dropoffZip: "62702",
    destinationName: "Springfield Medical Center",
    
    rideDate: "2025-10-25",
    rideTime: "09:30",
    roundTrip: true,
    numberOfRiders: 1,
    estimatedDuration: "60",
    purpose: "Medical",
    notes: "Patient needs help getting to entrance"
  })
});

const result = await response.json();
// { success: true, ride: {...}, clientId: 123 }
```

## Testing

### Manual Testing Checklist

- [ ] Create ride with new client
- [ ] Create ride with existing client (verify update)
- [ ] Test all special requirements checkboxes
- [ ] Test pickup from home vs. alternative address
- [ ] Test round trip checkbox
- [ ] Test form validation (submit with missing fields)
- [ ] Test date/time pickers
- [ ] Test purpose dropdown
- [ ] Verify ride appears in rides list
- [ ] Verify client profile is created/updated
- [ ] Test cancel button
- [ ] Test mobile responsiveness

## Troubleshooting

### Common Issues

**Issue**: Form doesn't submit
- Check browser console for errors
- Verify all required fields are filled
- Check network tab for API response

**Issue**: Client created multiple times
- The system checks by name and org
- Consider adding phone number to uniqueness check
- May need more robust duplicate detection

**Issue**: Special requirements not saving
- Check database schema has columns
- Verify client_profiles table structure
- Check server console logs

## Support

For questions or issues:
1. Check server console logs
2. Check browser console
3. Verify database schema matches expected structure
4. Ensure user has Dispatcher role
