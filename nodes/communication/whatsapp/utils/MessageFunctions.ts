/**
 * Message Functions
 * Message-specific processing and transformations
 */

import { cleanPhoneNumberForWhatsApp } from './PhoneUtils';
import { 
  TemplateComponent, 
  TemplateParameter, 
  WhatsAppRequestOptions,
  TextMessagePayload,
  TemplateMessagePayload,
  MediaMessagePayload,
  LocationMessagePayload,
  ContactMessagePayload,
  InteractiveMessagePayload,
  Contact
} from '../types';
import { 
  TEMPLATE_COMPONENT_TYPES, 
  TEMPLATE_PARAMETER_TYPES,
  WHATSAPP_BASE_URL_V18 
} from '../constants';

// Inline logger (no external dependency)
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

/**
 * Set message type in request body
 * @param requestOptions - Request options to modify
 * @param operation - Operation type
 * @param messageType - Message type
 * @returns Modified request options
 */
export function setMessageType(
  requestOptions: WhatsAppRequestOptions,
  operation: string,
  messageType?: string
): WhatsAppRequestOptions {
  let actualType = messageType;
  
  if (operation === 'sendTemplate') {
    actualType = 'template';
  }
  
  if (requestOptions.body && typeof requestOptions.body === 'object') {
    (requestOptions.body as any).type = actualType;
  }
  
  return requestOptions;
}

/**
 * Clean and set phone number in request body
 * @param requestOptions - Request options to modify
 * @param phoneNumber - Phone number to clean
 * @returns Modified request options
 */
export function cleanPhoneNumber(
  requestOptions: WhatsAppRequestOptions,
  phoneNumber: string
): WhatsAppRequestOptions {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phoneNumber);
  
  if (!requestOptions.body) {
    requestOptions.body = {};
  }
  
  if (typeof requestOptions.body === 'object') {
    (requestOptions.body as any).to = cleanPhone;
  }
  
  return requestOptions;
}

/**
 * Process template info (name and language)
 * @param requestOptions - Request options to modify
 * @param template - Template string in format "name|language"
 * @returns Modified request options
 */
export function processTemplateInfo(
  requestOptions: WhatsAppRequestOptions,
  template: string
): WhatsAppRequestOptions {
  const [name, language] = template.split('|');
  
  if (!requestOptions.body) {
    requestOptions.body = {};
  }
  
  if (typeof requestOptions.body === 'object') {
    const body = requestOptions.body as any;
    if (!body.template) {
      body.template = {};
    }
    body.template.name = name;
    body.template.language = { code: language || 'en' };
  }
  
  return requestOptions;
}

/**
 * Process template components
 * @param components - Components data from parameters
 * @returns Array of template components
 */
export function processTemplateComponents(components: any): TemplateComponent[] {
  if (!components || !components.component) {
    return [];
  }

  const componentsArray: TemplateComponent[] = [];

  for (const component of components.component as any[]) {
    const comp: TemplateComponent = {
      type: component.type,
    };

    if (component.type === TEMPLATE_COMPONENT_TYPES.BODY) {
      comp.parameters = processBodyParameters(component.bodyParameters);
    } else if (component.type === TEMPLATE_COMPONENT_TYPES.HEADER) {
      comp.parameters = processHeaderParameters(component.headerParameters);
    } else if (component.type === TEMPLATE_COMPONENT_TYPES.BUTTON) {
      comp.sub_type = component.sub_type;
      comp.index = component.index?.toString();
      comp.parameters = processButtonParameters(component.buttonParameters);
    }

    componentsArray.push(comp);
  }

  return componentsArray;
}

/**
 * Process body parameters
 * @param bodyParameters - Body parameters data
 * @returns Array of template parameters
 */
function processBodyParameters(bodyParameters: any): TemplateParameter[] {
  if (!bodyParameters || !bodyParameters.parameter) {
    return [];
  }

  return (bodyParameters.parameter as any[]).map((param: any) => {
    if (param.type === TEMPLATE_PARAMETER_TYPES.TEXT) {
      return { type: 'text', text: param.text };
    } else if (param.type === TEMPLATE_PARAMETER_TYPES.CURRENCY) {
      return {
        type: 'currency',
        currency: {
          code: param.code,
          fallback_value: param.fallback_value || `${param.code} ${param.amount_1000 / 1000}`,
          amount_1000: (param.amount_1000 as number) * 1000,
        },
      };
    } else if (param.type === TEMPLATE_PARAMETER_TYPES.DATE_TIME) {
      return {
        type: 'date_time',
        date_time: {
          fallback_value: param.date_time,
        },
      };
    }
    return param;
  });
}

/**
 * Process header parameters
 * @param headerParameters - Header parameters data
 * @returns Array of template parameters
 */
function processHeaderParameters(headerParameters: any): TemplateParameter[] {
  if (!headerParameters || !headerParameters.parameter) {
    return [];
  }

  return (headerParameters.parameter as any[]).map((param: any) => {
    if (param.type === TEMPLATE_PARAMETER_TYPES.IMAGE) {
      return {
        type: 'image',
        image: {
          link: param.imageLink,
        },
      };
    } else if (param.type === TEMPLATE_PARAMETER_TYPES.TEXT) {
      return { type: 'text', text: param.text };
    } else if (param.type === TEMPLATE_PARAMETER_TYPES.CURRENCY) {
      return {
        type: 'currency',
        currency: {
          code: param.code,
          fallback_value: param.fallback_value || `${param.code} ${param.amount_1000 / 1000}`,
          amount_1000: (param.amount_1000 as number) * 1000,
        },
      };
    } else if (param.type === TEMPLATE_PARAMETER_TYPES.DATE_TIME) {
      return {
        type: 'date_time',
        date_time: {
          fallback_value: param.date_time,
        },
      };
    }
    return param;
  });
}

/**
 * Process button parameters
 * @param buttonParameters - Button parameters data
 * @returns Array of template parameters
 */
function processButtonParameters(buttonParameters: any): TemplateParameter[] {
  if (!buttonParameters || !buttonParameters.parameter) {
    return [];
  }

  const param = buttonParameters.parameter;
  if (param.type === 'payload') {
    return [{ type: 'payload', payload: param.payload }];
  } else if (param.type === 'text') {
    return [{ type: 'text', text: param.text }];
  }
  return [];
}

/**
 * Add template components to request body
 * @param requestOptions - Request options to modify
 * @param components - Components to add
 * @returns Modified request options
 */
export function addTemplateComponents(
  requestOptions: WhatsAppRequestOptions,
  components: TemplateComponent[]
): WhatsAppRequestOptions {
  if (!requestOptions.body) {
    requestOptions.body = {};
  }

  if (typeof requestOptions.body === 'object') {
    const body = requestOptions.body as any;
    if (!body.template) {
      body.template = {};
    }
    body.template.components = components;
  }

  return requestOptions;
}

/**
 * Process error response and format error message
 * @param response - HTTP response
 * @param responseBody - Response body
 * @param messageType - Message type that was sent
 * @returns Formatted error message
 */
export function processErrorResponse(
  response: { status: number; statusText: string },
  responseBody: any,
  messageType?: string
): Error {
  const statusCode = response.status;
  const error = responseBody?.error || {};

  if (statusCode === 500) {
    return new Error(
      'Sending failed. If you\'re sending to a new test number, try sending a message to it from within the Meta developer portal first.'
    );
  }

  if (statusCode === 400) {
    let errorMessage = error.message || 'Bad request';
    errorMessage = errorMessage.replace(/^\(#\d+\)\s*/, '');

    if (errorMessage.endsWith('is not a valid whatsapp business account media attachment ID')) {
      return new Error(`Invalid ${messageType || 'media'} ID: ${errorMessage}`);
    }

    if (errorMessage.endsWith('is not a valid URI.')) {
      return new Error(`Invalid ${messageType || 'media'} URL: ${errorMessage}`);
    }

    return new Error(`Bad request: ${errorMessage}`);
  }

  if (statusCode === 401) {
    return new Error('Unauthorized: Invalid access token');
  }

  if (statusCode === 403) {
    return new Error('Forbidden: Check your permissions');
  }

  if (statusCode === 404) {
    return new Error('Resource not found');
  }

  return new Error(`API error [${statusCode}]: ${error.message || response.statusText}`);
}

/**
 * Build text message payload
 * @param recipient - Recipient phone number
 * @param text - Message text
 * @param previewUrl - Show URL previews
 * @returns Text message payload
 */
export function buildTextMessagePayload(
  recipient: string,
  text: string,
  previewUrl?: boolean
): TextMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumberForWhatsApp(recipient),
    type: 'text',
    text: {
      body: text,
      preview_url: previewUrl || false,
    },
  };
}

/**
 * Build template message payload
 * @param recipient - Recipient phone number
 * @param templateName - Template name
 * @param templateLanguage - Template language code
 * @param components - Template components
 * @returns Template message payload
 */
export function buildTemplateMessagePayload(
  recipient: string,
  templateName: string,
  templateLanguage: string,
  components?: TemplateComponent[]
): TemplateMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumberForWhatsApp(recipient),
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLanguage || 'en',
      },
      components: components || [],
    },
  };
}

/**
 * Build media message payload
 * @param recipient - Recipient phone number
 * @param mediaType - Media type
 * @param mediaId - Media ID (if using uploaded media)
 * @param mediaLink - Media URL (if using link)
 * @param caption - Media caption
 * @param filename - Filename (for documents)
 * @returns Media message payload
 */
export function buildMediaMessagePayload(
  recipient: string,
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker',
  mediaId?: string,
  mediaLink?: string,
  caption?: string,
  filename?: string
): MediaMessagePayload {
  const payload: MediaMessagePayload = {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumberForWhatsApp(recipient),
    type: mediaType,
  };

  const mediaContent: any = {};
  if (mediaId) {
    mediaContent.id = mediaId;
  } else if (mediaLink) {
    mediaContent.link = mediaLink;
  }

  if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
    mediaContent.caption = caption;
  }

  if (filename && mediaType === 'document') {
    mediaContent.filename = filename;
  }

  payload[mediaType] = mediaContent;

  return payload;
}

/**
 * Build location message payload
 * @param recipient - Recipient phone number
 * @param longitude - Longitude
 * @param latitude - Latitude
 * @param name - Location name (optional)
 * @param address - Location address (optional)
 * @returns Location message payload
 */
export function buildLocationMessagePayload(
  recipient: string,
  longitude: number,
  latitude: number,
  name?: string,
  address?: string
): LocationMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumberForWhatsApp(recipient),
    type: 'location',
    location: {
      longitude,
      latitude,
      ...(name && { name }),
      ...(address && { address }),
    },
  };
}

/**
 * Build contact message payload
 * @param recipient - Recipient phone number
 * @param contacts - Array of contacts
 * @returns Contact message payload
 */
export function buildContactMessagePayload(
  recipient: string,
  contacts: Contact[]
): ContactMessagePayload {
  return {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumberForWhatsApp(recipient),
    type: 'contacts',
    contacts,
  };
}

