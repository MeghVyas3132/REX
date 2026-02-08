/**
 * Phone Number Utilities
 * Functions for phone number validation, sanitization, and formatting
 */

/**
 * Sanitize phone number by removing formatting characters
 * @param phoneNumber - Phone number to sanitize
 * @returns Sanitized phone number (digits only)
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  // Remove spaces, dashes, parentheses, plus signs, and other non-digit characters
  return phoneNumber.replace(/[\s\-\(\)\+\.]/g, '');
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number to validate
 * @returns True if valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  const sanitized = sanitizePhoneNumber(phoneNumber);
  // Basic validation: 10-20 digits
  return /^\d{10,20}$/.test(sanitized);
}

/**
 * Format phone number with country code
 * @param phoneNumber - Phone number to format
 * @param countryCode - Country code to add (e.g., '1' for US)
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) return '';
  
  // If country code provided and number doesn't start with it, add it
  if (countryCode && !sanitized.startsWith(countryCode)) {
    return `${countryCode}${sanitized}`;
  }
  
  return sanitized;
}

/**
 * Extract country code from phone number
 * @param phoneNumber - Phone number
 * @returns Country code if found, null otherwise
 */
export function extractCountryCode(phoneNumber: string): string | null {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) return null;
  
  // Common country codes (1-3 digits)
  // This is a simplified version - full implementation would use a library
  const commonCodes = ['1', '44', '33', '49', '39', '34', '81', '86', '91', '7', '55', '52'];
  
  for (const code of commonCodes) {
    if (sanitized.startsWith(code) && sanitized.length > code.length) {
      return code;
    }
  }
  
  return null;
}

/**
 * Normalize phone number to E.164 format
 * @param phoneNumber - Phone number to normalize
 * @param defaultCountryCode - Default country code if not present
 * @returns E.164 formatted number (e.g., +1234567890)
 */
export function normalizePhoneNumber(phoneNumber: string, defaultCountryCode?: string): string {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) return '';
  
  // If already starts with country code, add +
  const countryCode = extractCountryCode(sanitized) || defaultCountryCode;
  if (countryCode) {
    if (sanitized.startsWith(countryCode)) {
      return `+${sanitized}`;
    } else {
      return `+${countryCode}${sanitized}`;
    }
  }
  
  // If no country code, return as is (WhatsApp will handle it)
  return sanitized;
}

/**
 * Clean phone number for WhatsApp API (removes + and formatting)
 * WhatsApp API expects phone numbers without + prefix
 * @param phoneNumber - Phone number to clean
 * @returns Cleaned phone number
 */
export function cleanPhoneNumberForWhatsApp(phoneNumber: string): string {
  if (!phoneNumber) return '';
  // Remove + prefix and all formatting
  return sanitizePhoneNumber(phoneNumber.replace(/^\+/, ''));
}

