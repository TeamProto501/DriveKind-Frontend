# Ride Matching Form - Quick Start Guide

## 🎯 What Was Created

A complete ride booking system for dispatchers that collects all necessary client information and ride details in one comprehensive form.

## 📁 Files Created

```
src/
├── lib/
│   ├── components/
│   │   └── RideMatchingForm.svelte          ✅ Main form component
│   └── types.ts                              ✅ Updated with new types
├── routes/
    └── dispatcher/
        └── rides/
            ├── new/
            │   └── +page.svelte              ✅ Integration page
            └── create-with-client/
                └── +server.ts                ✅ Server endpoint
```

## 🚀 How to Access

### URL
Navigate to: **`/dispatcher/rides/new`**

### From Existing Rides Page
Add this button to `src/routes/dispatcher/rides/+page.svelte`:

```svelte
<Button onclick={() => goto('/dispatcher/rides/new')}>
  <Plus class="w-4 h-4 mr-2" />
  Create New Ride
</Button>
```

## 📋 Form Sections

### 1️⃣ Client Information
```
✓ First Name *
✓ Last Name *
✓ Street Address *
✓ Address 2
✓ City *
✓ State *
✓ ZIP Code *
```

### 2️⃣ Special Requirements
```
✓ Mobility Assistance (dropdown)
  - None
  - Wheelchair
  - Walker
  - Cane
  - Crutches
  - Other

✓ Other Limitations (text)
✓ Car Height Needed (checkbox)
✓ Service Animal (checkbox)
✓ Oxygen Required (checkbox)
✓ Allergies (text)
```

### 3️⃣ Pickup Location
```
✓ Use Client's Home Address (checkbox)
  OR
✓ Alternative Pickup Address
  - Street Address
  - Address 2
  - City, State, ZIP
```

### 4️⃣ Dropoff Location
```
✓ Destination Name
✓ Dropoff Street Address *
✓ Dropoff Address 2
✓ Dropoff City *
✓ Dropoff State *
✓ Dropoff ZIP *
```

### 5️⃣ Schedule & Details
```
✓ Ride Date *
✓ Ride Time *
✓ Number of Riders
✓ Estimated Duration (minutes)
✓ Round Trip (checkbox)
✓ Purpose * (dropdown)
  - Medical Appointment
  - Shopping
  - Social/Recreation
  - Religious Service
  - Work
  - Other
✓ Additional Notes
```

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Dispatcher fills out form                                │
│     /dispatcher/rides/new                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Form submits to server                                   │
│     POST /dispatcher/rides/create-with-client                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Server checks authentication                             │
│     - Verify user is logged in                               │
│     - Confirm Dispatcher/Admin role                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Client Management                                        │
│     - Search for existing client (by name + org)             │
│     - If found: Update special requirements                  │
│     - If not found: Create new client profile                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Create Ride                                              │
│     - Link to client                                         │
│     - Set status = "Requested"                               │
│     - Store all ride details                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Success Response                                         │
│     - Return ride data                                       │
│     - Show success message                                   │
│     - Redirect to /dispatcher/rides                          │
└─────────────────────────────────────────────────────────────┘
```

## 💾 Database Impact

### Tables Modified

**`client_profiles`** - Creates or updates:
```sql
INSERT INTO client_profiles (
  org_id, first_name, last_name,
  street_address, address2, city, state, zipcode,
  mobility_assistance, other_limitations,
  car_height_needed, service_animal, oxygen, allergies
) VALUES (...)
```

**`rides`** - Creates new ride:
```sql
INSERT INTO rides (
  org_id, client_id, dispatcher_user_id,
  purpose, destination_name,
  dropoff_address, dropoff_city, dropoff_state, dropoff_zipcode,
  pickup_from_home, alt_pickup_address, alt_pickup_city, ...,
  appointment_time, round_trip, riders,
  estimated_appointment_length, notes, status
) VALUES (...)
```

## ✅ Features

- ✨ **Smart Pickup Address**: Auto-fills from client address
- 🔒 **Form Validation**: Required fields marked and validated
- 📱 **Responsive Design**: Works on mobile and desktop
- ♿ **Accessibility Requirements**: Comprehensive special needs tracking
- 🔄 **Duplicate Prevention**: Finds existing clients before creating new
- 💬 **User Feedback**: Loading, success, and error states
- 🎯 **Auto-redirect**: Returns to rides list after success

## 🧪 Testing the Form

1. Navigate to `/dispatcher/rides/new`
2. Fill in client information:
   ```
   First Name: John
   Last Name: Doe
   Street Address: 123 Main St
   City: Springfield
   State: IL
   ZIP: 62701
   ```
3. Select special requirements:
   ```
   Mobility Assistance: Wheelchair
   Car Height Needed: ✓
   Oxygen: ✓
   ```
4. Leave "Use client's home address" checked
5. Fill dropoff location:
   ```
   Destination: Springfield Hospital
   Address: 456 Hospital Dr
   City: Springfield
   State: IL
   ZIP: 62702
   ```
6. Set schedule:
   ```
   Date: [Tomorrow]
   Time: 09:30 AM
   Round Trip: ✓
   Purpose: Medical Appointment
   ```
7. Click "Create Ride & Find Drivers"
8. Verify success and redirect

## 🐛 Troubleshooting

### Form Won't Submit
- ✓ Check all required fields are filled (marked with *)
- ✓ Check browser console for errors
- ✓ Verify date is not in the past

### Server Error
- ✓ Check server console logs
- ✓ Verify database schema matches
- ✓ Confirm user has Dispatcher role

### Client Created Multiple Times
- ✓ System checks by first name, last name, and org
- ✓ May need to search manually before creating
- ✓ Consider adding phone number to form

## 🎨 Customization

### Change Required Fields
Edit validation in `RideMatchingForm.svelte`:
```typescript
function validateForm(): boolean {
  errors = {};
  if (!formData.firstName.trim()) errors.firstName = 'Required';
  // Add or remove validation rules
}
```

### Modify Purpose Options
Edit dropdown in `RideMatchingForm.svelte`:
```svelte
<option value="Medical">Medical Appointment</option>
<option value="NewPurpose">New Purpose</option>
```

### Add New Fields
1. Add to `formData` state in `RideMatchingForm.svelte`
2. Add HTML input field
3. Update `RideMatchingFormData` interface in `types.ts`
4. Update server endpoint to save new field

## 📊 What's Next?

### Recommended Enhancements

1. **Driver Matching** - Auto-suggest drivers after creation
2. **Client Search** - Autocomplete existing clients
3. **Address Validation** - Google Maps integration
4. **Recurring Rides** - Schedule repeating appointments
5. **Email Notifications** - Alert drivers of new rides

## 🔗 Related Files

- Form Component: `src/lib/components/RideMatchingForm.svelte`
- Integration Page: `src/routes/dispatcher/rides/new/+page.svelte`
- Server Endpoint: `src/routes/dispatcher/rides/create-with-client/+server.ts`
- Type Definitions: `src/lib/types.ts`
- Full Documentation: `RIDE_MATCHING_FORM_GUIDE.md`

---

**Ready to use!** 🎉

Navigate to `/dispatcher/rides/new` to start creating rides with complete client information.
