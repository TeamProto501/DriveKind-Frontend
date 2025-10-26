// Validation utilities for form inputs
// Prevents SQL injection, validates formats, and ensures data integrity

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Sanitizes input to prevent SQL injection and XSS attacks
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .slice(0, 1000); // Limit length
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(email);
  
  if (!sanitized) {
    errors.push('Email is required');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sanitized && !emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates phone number format
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(phone);
  
  // Allow digits, spaces, dashes, parentheses, and +
  const phoneRegex = /^[\d\s\-\(\)\.\+]{7,20}$/;
  if (!phoneRegex.test(sanitized)) {
    errors.push('Phone must be 7-20 characters (digits, spaces, dashes, parentheses, dots, or +)');
  }
  
  const digitsOnly = sanitized.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    errors.push('Phone must contain 7-15 digits');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates address
 */
export function validateAddress(address: string, fieldName: string = 'Address'): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(address);
  
  if (sanitized && sanitized.length > 200) {
    errors.push(`${fieldName} must be 200 characters or less`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates city name
 */
export function validateCity(city: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(city);
  
  if (!sanitized) {
    errors.push('City is required');
  } else if (sanitized.length > 50) {
    errors.push('City must be 50 characters or less');
  } else if (!/^[A-Za-z\s\-\.]+$/.test(sanitized)) {
    errors.push('City must contain only letters, spaces, dashes, or dots');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates state
 */
export function validateState(state: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(state);
  
  if (!sanitized) {
    errors.push('State is required');
  } else if (sanitized.length > 50) {
    errors.push('State must be 50 characters or less');
  } else if (!/^[A-Za-z\s]+$/.test(sanitized)) {
    errors.push('State must contain only letters and spaces');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates zip code
 */
export function validateZipCode(zipcode: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(zipcode);
  
  // US zip code format: 12345 or 12345-6789
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(sanitized)) {
    errors.push('Zip code must be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates numeric input (for mileage, hours, etc.)
 */
export function validateNumber(value: string, fieldName: string, min: number = 0, max: number = 9999): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(value);
  
  if (!sanitized) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  
  const numValue = parseFloat(sanitized);
  
  if (isNaN(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors };
  }
  
  if (numValue < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (numValue > max) {
    errors.push(`${fieldName} must not exceed ${max}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates text field (for names, notes, etc.)
 */
export function validateText(text: string, fieldName: string, maxLength: number = 200, required: boolean = false): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(text);
  
  if (required && !sanitized) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  
  if (sanitized && sanitized.length > maxLength) {
    errors.push(`${fieldName} must be ${maxLength} characters or less`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates date time
 */
export function validateDateTime(dateTime: string, fieldName: string = 'Date/Time'): ValidationResult {
  const errors: string[] = [];
  
  if (!dateTime) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  
  const date = new Date(dateTime);
  
  if (isNaN(date.getTime())) {
    errors.push(`Invalid ${fieldName.toLowerCase()} format`);
  }
  
  if (date < new Date()) {
    errors.push(`${fieldName} cannot be in the past`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates required field
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && value.trim() === '')) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Combines multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validates ride completion data
 */
export function validateRideCompletion(data: {
  miles_driven: string;
  hours: string;
  riders?: string;
}): ValidationResult {
  const errors: string[] = [];
  
  // Validate miles driven
  const milesResult = validateNumber(data.miles_driven, 'Miles driven', 0, 1000);
  errors.push(...milesResult.errors);
  
  // Validate hours
  const hoursResult = validateNumber(data.hours, 'Hours', 0, 24);
  errors.push(...hoursResult.errors);
  
  // Validate riders if provided
  if (data.riders) {
    const ridersResult = validateNumber(data.riders, 'Number of riders', 0, 20);
    errors.push(...ridersResult.errors);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates address components
 */
export function validateAddressComponents(data: {
  address: string;
  city: string;
  state: string;
  zipcode: string;
}): ValidationResult {
  const errors: string[] = [];
  
  errors.push(...validateAddress(data.address, 'Address').errors);
  errors.push(...validateCity(data.city).errors);
  errors.push(...validateState(data.state).errors);
  errors.push(...validateZipCode(data.zipcode).errors);
  
  return {
    valid: errors.length === 0,
    errors
  };
}
