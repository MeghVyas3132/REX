/**
 * WhatsApp Node Constants
 * Centralized constants and configuration values
 */

// API Base URLs
export const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v13.0/';
export const WHATSAPP_BASE_URL_V18 = 'https://graph.facebook.com/v18.0/';
export const WHATSAPP_BASE_URL_V19 = 'https://graph.facebook.com/v19.0/';
export const WHATSAPP_OAUTH_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';

// API Endpoints
export const WHATSAPP_MESSAGES_ENDPOINT = '/messages';
export const WHATSAPP_MEDIA_ENDPOINT = '/media';
export const WHATSAPP_PHONE_NUMBERS_ENDPOINT = '/phone_numbers';
export const WHATSAPP_TEMPLATES_ENDPOINT = '/message_templates';

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  TEMPLATE: 'template',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACTS: 'contacts',
  STICKER: 'sticker',
  INTERACTIVE: 'interactive',
} as const;

// Media Types
export const MEDIA_TYPES = ['image', 'video', 'audio', 'sticker', 'document'] as const;

// Operations
export const OPERATIONS = {
  SEND: 'send',
  SEND_TEMPLATE: 'sendTemplate',
  SEND_AND_WAIT: 'sendAndWait',
  MEDIA_UPLOAD: 'mediaUpload',
  MEDIA_DOWNLOAD: 'mediaUrlGet',
  MEDIA_DELETE: 'mediaDelete',
} as const;

// Resources
export const RESOURCES = {
  MESSAGE: 'message',
  MEDIA: 'media',
} as const;

// Media Path Options
export const MEDIA_PATH_OPTIONS = {
  USE_LINK: 'useMediaLink',
  USE_MEDIA_ID: 'useMediaId',
  USE_N8N_BINARY: 'useMedian8n',
} as const;

// Template Component Types
export const TEMPLATE_COMPONENT_TYPES = {
  BODY: 'body',
  HEADER: 'header',
  BUTTON: 'button',
} as const;

// Template Parameter Types
export const TEMPLATE_PARAMETER_TYPES = {
  TEXT: 'text',
  CURRENCY: 'currency',
  DATE_TIME: 'date_time',
  IMAGE: 'image',
} as const;

// Button Sub Types
export const BUTTON_SUB_TYPES = {
  QUICK_REPLY: 'quick_reply',
  URL: 'url',
} as const;

// Limits
export const MAX_TEXT_MESSAGE_LENGTH = 4096;
export const MAX_PHONE_NUMBER_LENGTH = 20;
export const MIN_PHONE_NUMBER_LENGTH = 10;

// Default Values
export const DEFAULT_MESSAGE_TYPE = 'text';
export const DEFAULT_OPERATION = 'sendTemplate';
export const DEFAULT_RESOURCE = 'message';
export const DEFAULT_MEDIA_PATH = 'useMediaLink';
export const DEFAULT_TEMPLATE_LANGUAGE = 'en';

// Error Messages
export const ERROR_MESSAGES = {
  MISSING_ACCESS_TOKEN: 'Required parameter "accessToken" is missing',
  MISSING_PHONE_NUMBER_ID: 'Required parameter "phoneNumberId" is missing',
  // Business account ID is optional in send flow; if required for templates, we validate per operation
  MISSING_BUSINESS_ACCOUNT_ID: 'Required parameter "businessAccountId" is missing',
  MISSING_RECIPIENT: 'Recipient phone number is required',
  MISSING_MESSAGE: 'Message text is required',
  MISSING_TEMPLATE_NAME: 'Template name is required',
  MISSING_MEDIA_ID: 'Media ID is required',
  MISSING_MEDIA_URL: 'Media URL is required',
  INVALID_PHONE_NUMBER: 'Invalid phone number format',
  INVALID_MEDIA_TYPE: 'Invalid media type',
  API_ERROR: 'WhatsApp API error',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized - check your access token',
  FORBIDDEN: 'Forbidden - check your permissions',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'WhatsApp API server error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Message sent successfully',
  MEDIA_UPLOADED: 'Media uploaded successfully',
  MEDIA_DELETED: 'Media deleted successfully',
} as const;

// Currency Codes (Common ones - full list can be imported from currency-codes library)
export const CURRENCY_CODES = [
  { name: 'USD - US Dollar', value: 'USD' },
  { name: 'EUR - Euro', value: 'EUR' },
  { name: 'GBP - British Pound', value: 'GBP' },
  { name: 'JPY - Japanese Yen', value: 'JPY' },
  { name: 'AUD - Australian Dollar', value: 'AUD' },
  { name: 'CAD - Canadian Dollar', value: 'CAD' },
  { name: 'CHF - Swiss Franc', value: 'CHF' },
  { name: 'CNY - Chinese Yuan', value: 'CNY' },
  { name: 'INR - Indian Rupee', value: 'INR' },
  { name: 'BRL - Brazilian Real', value: 'BRL' },
  { name: 'MXN - Mexican Peso', value: 'MXN' },
  { name: 'RUB - Russian Ruble', value: 'RUB' },
  { name: 'ZAR - South African Rand', value: 'ZAR' },
  { name: 'SGD - Singapore Dollar', value: 'SGD' },
  { name: 'HKD - Hong Kong Dollar', value: 'HKD' },
  { name: 'NOK - Norwegian Krone', value: 'NOK' },
  { name: 'SEK - Swedish Krona', value: 'SEK' },
  { name: 'DKK - Danish Krone', value: 'DKK' },
  { name: 'PLN - Polish Zloty', value: 'PLN' },
  { name: 'TRY - Turkish Lira', value: 'TRY' },
] as const;

// Contact Phone Types
export const CONTACT_PHONE_TYPES = {
  CELL: 'CELL',
  HOME: 'HOME',
  WORK: 'WORK',
  IPHONE: 'IPHONE',
  MAIN: 'MAIN',
  WA_ID: 'wa_id',
} as const;

// Contact Address Types
export const CONTACT_ADDRESS_TYPES = {
  HOME: 'HOME',
  WORK: 'WORK',
} as const;

// Contact Email Types
export const CONTACT_EMAIL_TYPES = {
  HOME: 'HOME',
  WORK: 'WORK',
} as const;

// Contact URL Types
export const CONTACT_URL_TYPES = {
  HOME: 'HOME',
  WORK: 'WORK',
} as const;

