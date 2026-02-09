/**
 * Generic Functions
 * Core API request handling and shared utilities
 */

import { 
  WHATSAPP_BASE_URL, 
  WHATSAPP_BASE_URL_V18, 
  WHATSAPP_BASE_URL_V19,
  WHATSAPP_PHONE_NUMBERS_ENDPOINT,
  WHATSAPP_TEMPLATES_ENDPOINT
} from '../constants';
import { WhatsAppApiResponse, WhatsAppApiError, WhatsAppRequestOptions, PhoneNumberInfo, TemplateInfo } from '../types';
import { cleanPhoneNumberForWhatsApp } from './PhoneUtils';

// Inline logger (no external dependency)
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

/**
 * Make API request to WhatsApp
 * @param options - Request options
 * @param credentials - WhatsApp credentials
 * @returns API response
 */
export async function whatsappApiRequest(
  options: WhatsAppRequestOptions,
  credentials: { accessToken: string; businessAccountId: string }
): Promise<any> {
  const { method, url, headers = {}, body, baseURL } = options;
  const { accessToken } = credentials;

  const baseUrl = baseURL || WHATSAPP_BASE_URL_V18;
  const fullUrl = url.startsWith('http') ? url : `${baseUrl.replace(/\/$/, '')}${url}`;

  const requestHeaders: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...headers,
  };

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { error: { message: responseText } };
    }

    if (!response.ok) {
      const error: WhatsAppApiError = responseData.error || {
        message: `HTTP ${response.status}: ${response.statusText}`,
        type: 'HttpError',
        code: response.status,
      };

      throw new Error(formatApiError(error));
    }

    return responseData;
  } catch (error: any) {
    if (error.message && error.message.includes('HTTP')) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Format API error message
 * @param error - API error object
 * @returns Formatted error message
 */
function formatApiError(error: WhatsAppApiError): string {
  let message = error.message || 'Unknown error';
  
  // Remove error code prefix if present (e.g., "(#100) Invalid parameter")
  message = message.replace(/^\(#\d+\)\s*/, '');
  
  if (error.code) {
    return `[${error.code}] ${message}`;
  }
  
  return message;
}

/**
 * Get available phone numbers for business account
 * @param credentials - WhatsApp credentials
 * @returns Array of phone number info
 */
export async function getPhoneNumbers(
  credentials: { accessToken: string; businessAccountId: string }
): Promise<PhoneNumberInfo[]> {
  try {
    const response = await whatsappApiRequest(
      {
        method: 'GET',
        url: `/${credentials.businessAccountId}${WHATSAPP_PHONE_NUMBERS_ENDPOINT}`,
        baseURL: WHATSAPP_BASE_URL_V18,
      },
      credentials
    );

    return response.data || [];
  } catch (error: any) {
    logger.error('Failed to fetch phone numbers', { error: error.message });
    throw new Error(`Failed to fetch phone numbers: ${error.message}`);
  }
}

/**
 * Get available templates for business account
 * @param credentials - WhatsApp credentials
 * @returns Array of template info
 */
export async function getTemplates(
  credentials: { accessToken: string; businessAccountId: string }
): Promise<TemplateInfo[]> {
  try {
    const response = await whatsappApiRequest(
      {
        method: 'GET',
        url: `/${credentials.businessAccountId}${WHATSAPP_TEMPLATES_ENDPOINT}`,
        baseURL: WHATSAPP_BASE_URL_V18,
      },
      credentials
    );

    return response.data || [];
  } catch (error: any) {
    logger.error('Failed to fetch templates', { error: error.message });
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }
}

/**
 * Validate credentials by making a test API call
 * @param credentials - WhatsApp credentials
 * @returns True if valid, throws error if invalid
 */
export async function validateCredentials(
  credentials: { accessToken: string; businessAccountId: string }
): Promise<boolean> {
  try {
    // Try to fetch business account info
    await whatsappApiRequest(
      {
        method: 'GET',
        url: `/${credentials.businessAccountId}`,
        baseURL: WHATSAPP_BASE_URL_V18,
      },
      credentials
    );
    return true;
  } catch (error: any) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('Invalid access token');
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      throw new Error('Invalid business account ID');
    }
    throw error;
  }
}

/**
 * Create message payload for send and wait operation
 * @param message - Message text
 * @param phoneNumberId - Phone number ID
 * @param recipientPhoneNumber - Recipient phone number
 * @param options - Optional message options
 * @returns Message payload
 */
export function createMessage(
  message: string,
  phoneNumberId: string,
  recipientPhoneNumber: string,
  options?: {
    appendAttribution?: boolean;
    attributionText?: string;
  }
): WhatsAppRequestOptions {
  const cleanPhone = cleanPhoneNumberForWhatsApp(recipientPhoneNumber);
  
  let messageBody = message;
  if (options?.appendAttribution) {
    const attribution = options.attributionText || 'This message was sent automatically with n8n';
    messageBody = `${message}\n\n${attribution}`;
  }

  return {
    method: 'POST',
    url: `/${phoneNumberId}/messages`,
    baseURL: WHATSAPP_BASE_URL_V18,
    body: {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: {
        body: messageBody,
      },
    },
  };
}

