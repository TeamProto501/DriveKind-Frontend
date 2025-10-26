# Validation Implementation Guide

## Overview
This guide explains the validation system implemented in the DriveKind application to prevent user input errors, SQL injection, and XSS attacks.

## Files

### Core Validation Utility
- **`src/lib/utils/validation.ts`** - Central validation functions

### Where Validation is Applied
- **Driver Ride Completion**: `src/routes/driver/rides/+page.svelte` and `+server.ts`
- **Dispatcher Ride Management**: `src/routes/dispatcher/rides/+page.svelte` (pending)
- **Profile Page**: `src/routes/profile/+page.svelte` (pending)

## Available Validation Functions

### Input Sanitization
```typescript
sanitizeInput(input: string): string
```
- Removes HTML brackets and SQL injection characters
- Limits input to 1000 characters
- Prevents XSS and SQL injection attacks

### Field Validations
1. **Email**: `validateEmail(email)` - Validates email format
2. **Phone**: `validatePhone(phone)` - Validates phone number (7-20 chars, 7-15 digits)
3. **Address**: `validateAddress(address)` - Validates address (max 200 chars)
4. **City**: `validateCity(city)` - Validates city name (letters, spaces, dashes only)
5. **State**: `validateState(state)` - Validates state (letters and spaces only)
6. **Zip Code**: `validateZipCode(zipcode)` - Validates US zip format (12345 or 12345-6789)
7. **Number**: `validateNumber(value, fieldName, min, max)` - Validates numeric input
8. **Text**: `validateText(text, fieldName, maxLength, required)` - Validates text fields
9. **DateTime**: `validateDateTime(dateTime)` - Validates date/time and prevents past dates
10. **Required**: `validateRequired(value, fieldName)` - Checks for empty required fields

### Composite Validations
```typescript
validateRideCompletion(data: { miles_driven, hours, riders })
validateAddressComponents(data: { address, city, state, zipcode })
combineValidations(...results) // Combine multiple validation results
```

## Usage Example

### In a Component
```typescript
import { validateRideCompletion, sanitizeInput } from '$lib/utils/validation';

async function submitForm() {
  // Validate data
  const validation = validateRideCompletion({
    miles_driven: formData.miles_driven,
    hours: formData.hours,
    riders: formData.riders
  });
  
  if (!validation.valid) {
    alert('Please fix errors:\n• ' + validation.errors.join('\n• '));
    return;
  }
  
  // Sanitize text inputs
  const sanitizedNotes = sanitizeInput(formData.notes);
  
  // Send to server
  // ...
}
```

### In a Server Endpoint
```typescript
import { sanitizeInput } from '$lib/utils/validation';

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  
  // Supabase automatically prevents SQL injection when using .insert(), .update(), etc.
  // But we still sanitize inputs for safety and data integrity
  
  const sanitizedNotes = sanitizeInput(data.notes);
  
  const { error } = await supabase
    .from('rides')
    .update({ notes: sanitizedNotes })
    .eq('ride_id', data.rideId);
    
  // ...
};
```

## SQL Injection Prevention

### How It Works
1. **Supabase Client**: Already prevents SQL injection through parameterized queries
2. **Input Sanitization**: Removes dangerous characters before processing
3. **Validation**: Ensures data format is correct before database operations

### What's Protected
- ✅ All text inputs are sanitized
- ✅ SQL injection characters (`'`, `"`, `;`, `\`) are removed
- ✅ HTML injection characters (`<`, `>`) are removed
- ✅ Input length is limited to prevent buffer overflow
- ✅ Supabase uses parameterized queries automatically

## Validation Rules by Field Type

### Address Fields
- Address: Max 200 characters, sanitized
- City: Required, max 50 chars, letters/spaces/dashes only
- State: Required, max 50 chars, letters/spaces only  
- Zip: Required, US format (12345 or 12345-6789)

### Phone Numbers
- Format: 7-20 characters (digits, spaces, dashes, parentheses, dots, `+`)
- Digit count: 7-15 digits
- Example: `(555) 123-4567`, `555.123.4567`, `+1 555 123 4567`

### Numeric Fields
- Miles driven: 0-1000
- Hours: 0-24
- Riders: 0-20
- All numeric values are validated before parsing

### Text Fields
- Names: Max 50 characters
- Notes: Max 200 characters
- All text is sanitized and trimmed

### Date/Time Fields
- Valid date format required
- Cannot be in the past
- ISO format preferred

## Testing Validation

### Test Cases
1. **Empty Required Fields**: Should show error
2. **Invalid Formats**: Should reject (e.g., invalid email, zip code)
3. **SQL Injection Attempts**: Should emit sanitized safe values
4. **XSS Attempts**: Should remove HTML tags
5. **Invalid Numbers**: Should reject (negative, too large, non-numeric)
6. **Past Dates**: Should reject past dates for future appointments

### Example Test Inputs
```javascript
// SQL injection attempt
"'; DROP TABLE rides; --" → ""  // Sanitized to empty string

// XSS attempt
"<script>alert('xss')</script>" → "scriptalert('xss')script"

// Invalid phone
"123" → Error: "Phone must be 7-20 characters"

// Invalid email
"notanemail" → Error: "Invalid email format"

// Invalid zip
"123" → Error: "Zip code must be 5 digits or 5+4 format"

// Invalid number
"-50" → Error: "Miles driven must be at least 0"
"5000" → Error: "Miles driven must not exceed 1000"
```

## Next Steps

### To Apply to Other Forms
1. Import validation functions: `import { validateXxx, sanitizeInput } from '$lib/utils/validation'`
2. Add validation before form submission
3. Sanitize all text inputs before sending to server
4. Display validation errors to user
5. Only submit if validation passes

### Forms to Update
- [ ] Dispatcher ride creation form
- [ ] Dispatcher ride edit form
- [ ] Profile edit form
- [ ] Client creation form
- [ ] Organization management form
- [ ] User management form

## Notes
- Supabase handles SQL injection prevention automatically
- Client-side validation improves UX but server-side validation is required
- Sanitization happens before database operations
- All validation errors are returned in a user-friendly format
